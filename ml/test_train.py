"""Unit checks for train.py's loss, weighting, split, threshold and negative-sample logic (no dataset needed).

    ml/.venv/bin/python ml/test_train.py
"""

import os
import sys
import unittest
from pathlib import Path

os.environ.setdefault("CUDA_VISIBLE_DEVICES", "")  # these checks are tiny; keep the GPU free for training
sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np  # noqa: E402
import tensorflow as tf  # noqa: E402

import train  # noqa: E402


class LossWeights(unittest.TestCase):
    def setUp(self):
        self.loss = train.sparse_smoothed_ce(0.1, 3)
        self.y = np.array([0, 1])  # image 0 is predicted correctly, image 1 wrongly
        self.logits = np.array([[5.0, 0, 0], [5.0, 0, 0]], np.float32)

    def test_loss_is_per_image(self):
        self.assertEqual(self.loss(self.y, self.logits).shape, (2,))

    def test_sample_weights_change_the_training_loss(self):
        model = tf.keras.Sequential([tf.keras.Input((3,)), tf.keras.layers.Identity()])
        model.compile(loss=self.loss)
        on_right = model.evaluate(self.logits, self.y, sample_weight=np.array([1.0, 0.0]), verbose=0)
        on_wrong = model.evaluate(self.logits, self.y, sample_weight=np.array([0.0, 1.0]), verbose=0)
        per_image = self.loss(self.y, self.logits).numpy()
        self.assertLess(on_right, on_wrong)
        self.assertAlmostEqual(on_wrong, per_image[1] / 2, places=4)  # sum_over_batch_size: weighted sum / 2


class Threshold(unittest.TestCase):
    def test_reports_failure_instead_of_a_fallback(self):
        probs = np.tile([[0.95, 0.05]], (50, 1))
        self.assertIsNone(train.pick_threshold(probs, np.ones(50, int), 0.95))

    def test_too_few_confident_answers_is_a_failure(self):
        probs = np.tile([[0.6, 0.4]], (50, 1))
        probs[:5] = [0.99, 0.01]
        y = np.ones(50, int)
        y[:5] = 0  # only the 5 confident answers are right: too few to trust
        self.assertIsNone(train.pick_threshold(probs, y, 0.95, min_accepted=20))

    def test_picks_lowest_threshold_that_holds_above(self):
        conf = np.linspace(0.31, 0.99, 400)
        probs = np.stack([conf, 1 - conf], 1)
        y = np.where(conf >= 0.7, 0, 1)  # right only above 0.7
        th = train.pick_threshold(probs, y, 0.95)
        self.assertIsNotNone(th)
        self.assertTrue(0.68 <= th <= 0.72, th)
        accepted = conf >= th
        self.assertGreaterEqual((y[accepted] == 0).mean(), 0.95)

    def test_a_lucky_dip_below_a_failing_band_is_not_picked(self):
        conf = np.linspace(0.31, 0.99, 600)
        probs = np.stack([conf, 1 - conf], 1)
        y = np.zeros(600, int)
        y[(conf > 0.9) & (np.arange(600) % 3 == 0)] = 1  # wrong a third of the time above 0.9
        self.assertIsNone(train.pick_threshold(probs, y, 0.95))


class Weights(unittest.TestCase):
    def test_classes_have_equal_weight_and_sources_their_shares(self):
        y = np.array([0] * 10 + [1] * 30 + [2] * 100)
        source = np.array(["photo"] * 10 + ["photo"] * 5 + ["video"] * 25 + ["video"] * 60 + ["synthetic"] * 40)
        w = train.source_weights(y, source, 3, photo_share=0.7, synthetic_share=0.25)
        totals = [w[y == c].sum() for c in range(3)]
        np.testing.assert_allclose(totals, totals[0], rtol=1e-5)
        class1 = w[y == 1]
        self.assertAlmostEqual(class1[:5].sum() / class1.sum(), 0.7, places=5)
        class2 = w[y == 2]
        self.assertAlmostEqual(w[(y == 2) & (source == "synthetic")].sum() / class2.sum(), 0.25, places=5)
        self.assertAlmostEqual(w.mean(), 1.0, places=5)


class Split(unittest.TestCase):
    def dataset(self, seed=0):
        """4 classes; each has 12 videos of 1-40 frames and 12 photo groups of 1-3 images."""
        rng = np.random.default_rng(seed)
        groups, y, source = [], [], []
        for c in range(4):
            for g in range(12):
                n = int(rng.integers(1, 40))
                groups += [f"video:{c}-{g}"] * n
                y += [c] * n
                source += ["video"] * n
            for g in range(12):
                n = int(rng.integers(1, 4))
                groups += [f"page:{c}-{g}"] * n
                y += [c] * n
                source += ["photo"] * n
        return np.array(y), groups, np.array(source)

    def test_groups_never_straddle_splits(self):
        y, groups, source = self.dataset()
        split = train.group_split(y, groups, source, 4, (0.15, 0.15), seed=1)
        for g in set(groups):
            self.assertEqual(len({split[i] for i, gg in enumerate(groups) if gg == g}), 1, g)

    def test_every_class_has_photos_and_video_in_every_split(self):
        # Photos are a small minority (as in the real data); stratifying by source keeps them in val and test.
        for seed in range(5):
            y, groups, source = self.dataset(seed)
            split = train.group_split(y, groups, source, 4, (0.15, 0.15), seed=seed)
            for c in range(4):
                for src in ("photo", "video"):
                    for s in (0, 1, 2):
                        self.assertTrue(((y == c) & (source == src) & (split == s)).any(), (seed, c, src, s))

    def test_small_class_keeps_one_group_for_training(self):
        split = train.group_split(np.array([0, 0, 1]), ["a", "b", "c"], np.array(["photo"] * 3), 2, (0.5, 0.5), seed=0)
        self.assertEqual(split[2], 0)
        self.assertIn(0, split[:2])

    def test_an_oversized_group_is_not_forced_into_a_held_out_split(self):
        # 100 images in one video plus 10 single photos (same source): a 15% target must not take the video.
        y = np.zeros(110, int)
        groups = ["video:big"] * 100 + [f"p{i}" for i in range(10)]
        split = train.group_split(y, groups, np.array(["video"] * 110), 1, (0.15, 0.15), seed=0)
        self.assertTrue((split[:100] == 0).all())


class Groups(unittest.TestCase):
    def test_images_sharing_an_origin_share_a_group(self):
        import csv
        import tempfile
        from PIL import Image
        with tempfile.TemporaryDirectory() as d:
            d = Path(d)
            with open(d / "web_sources.csv", "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["label", "path", "url", "page"])
                w.writerow(["a", "a/1.jpg", "u1", "https://blog/tour"])
                w.writerow(["a", "a/2.jpg", "u2", "https://blog/tour"])
                w.writerow(["a", "a/3.jpg", "u3", "https://other"])
            with open(d / "commons_sources.csv", "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["label", "path", "title", "source", "author", "license"])
                w.writerow(["a", "a/x.jpg", "", "", "Ann", ""])
                w.writerow(["a", "a/y.jpg", "", "", "Ann", ""])
                w.writerow(["b", "b/z.jpg", "", "", "Ann", ""])
            for name, size in [("p1.jpg", (800, 600)), ("p2.jpg", (600, 800)), ("p3.jpg", (100, 100))]:
                Image.new("RGB", size).save(d / name)
            rows = [{"filename": f, "label": l} for f, l in [
                ("video/a/vid1_00001.jpg", "a"), ("video/a/vid1_00002.jpg", "a"), ("video/a/vid2_00001.jpg", "a"),
                ("web/a/1.jpg", "a"), ("web/a/2.jpg", "a"), ("web/a/3.jpg", "a"),
                ("commons/a/x.jpg", "a"), ("commons/a/y.jpg", "a"), ("commons/b/z.jpg", "b"),
                ("1_22_33_n.jpg", "a"), ("4_55_66_n.jpg", "a"), ("p1.jpg", "a"), ("p2.jpg", "a"), ("p3.jpg", "a")]]
            g = train.source_groups(rows, d, ml_dir=d)
        self.assertEqual(g[0], g[1])
        self.assertNotEqual(g[0], g[2])
        self.assertEqual(g[3], g[4])
        self.assertNotEqual(g[3], g[5])
        self.assertEqual(g[6], g[7])
        self.assertNotEqual(g[6], g[8], "one photographer's series is grouped per landmark")
        self.assertEqual(g[9], g[10], "one Facebook album")
        self.assertEqual(g[11], g[12], "same camera shoot (portrait and landscape)")
        self.assertNotEqual(g[11], g[13])

    def test_near_duplicates_merge_their_groups(self):
        rng = np.random.default_rng(1)
        a = rng.integers(0, 255, (train.LOAD_SIZE, train.LOAD_SIZE, 3), dtype=np.uint8)
        b = np.clip(a.astype(int) + 2, 0, 255).astype(np.uint8)  # same picture, slightly brighter
        c = rng.integers(0, 255, (train.LOAD_SIZE, train.LOAD_SIZE, 3), dtype=np.uint8)
        merged, n = train.merge_near_duplicates(["g1", "g2", "g3"], train.difference_hashes(np.stack([a, b, c])))
        self.assertEqual(merged[0], merged[1])
        self.assertNotEqual(merged[0], merged[2])
        self.assertEqual(n, 1)


class Batches(unittest.TestCase):
    def position_image(self):
        """Pixel (r, c) holds (r, c, 0): a crop's top-left pixel reveals its offset."""
        r, c = np.mgrid[0:train.LOAD_SIZE, 0:train.LOAD_SIZE]
        return np.stack([r, c, np.zeros_like(r)], -1).astype(np.uint8)

    def test_training_crops_are_independent_per_image(self):
        images = np.stack([self.position_image()] * 64)
        crops = train.random_crops(images, np.random.default_rng(0))
        self.assertEqual(crops.shape, (64, train.IMG_SIZE, train.IMG_SIZE, 3))
        offsets = {(int(c[0, 0, 0]), int(c[0, 0, 1])) for c in crops}
        self.assertGreater(len(offsets), 32, "one offset per image, not one per batch")
        for c in crops:  # each crop is a contiguous in-bounds window
            t, l = int(c[0, 0, 0]), int(c[0, 0, 1])
            self.assertLessEqual(t + train.IMG_SIZE, train.LOAD_SIZE)
            self.assertEqual(int(c[-1, -1, 0]), t + train.IMG_SIZE - 1)
            self.assertEqual(int(c[-1, -1, 1]), l + train.IMG_SIZE - 1)

    def test_validation_batches_use_the_centre_crop(self):
        x = np.stack([self.position_image()] * 3)
        batch = next(iter(train.make_ds(x, np.zeros(3, np.int64), np.ones(3, np.float32), training=False, batch=3)))[0].numpy()
        np.testing.assert_array_equal(batch[0], self.position_image()[16:240, 16:240])

    def test_training_batches_have_model_input_size(self):
        x = np.stack([self.position_image()] * 8)
        batch = next(iter(train.make_ds(x, np.zeros(8, np.int64), np.ones(8, np.float32), training=True, batch=4)))[0]
        self.assertEqual(tuple(batch.shape), (4, train.IMG_SIZE, train.IMG_SIZE, 3))


class CameraAugment(unittest.TestCase):
    def test_degradations_keep_shape_and_vary_images(self):
        rng = np.random.default_rng(0)
        imgs = rng.integers(0, 255, (40, train.IMG_SIZE, train.IMG_SIZE, 3), dtype=np.uint8)
        out = train.camera_degrade(imgs, np.random.default_rng(1))
        self.assertEqual(out.shape, imgs.shape)
        self.assertEqual(out.dtype, np.uint8)
        changed = np.array([np.abs(o.astype(int) - i).mean() > 1 for o, i in zip(out, imgs)])
        self.assertTrue(10 < changed.sum() < 40, changed.sum())  # most images, not all, are degraded
        np.testing.assert_array_equal(out, train.camera_degrade(imgs, np.random.default_rng(1)))  # reproducible


class LearningRate(unittest.TestCase):
    def test_cosine_schedule_warms_up_then_decays_to_one_percent(self):
        from types import SimpleNamespace
        args = SimpleNamespace(finetune_schedule="cosine", finetune_lr=1e-4, finetune_epochs=25)
        lr = train.finetune_learning_rate(args, steps_per_epoch=100)
        self.assertAlmostEqual(float(lr(0)), 1e-5, places=9)
        self.assertAlmostEqual(float(lr(100)), 1e-4, places=9)  # peak after one epoch
        self.assertLess(float(lr(1300)), 1e-4)
        self.assertAlmostEqual(float(lr(2500)), 1e-6, places=9)  # 1% of the peak at the end
        self.assertEqual(train.finetune_learning_rate(SimpleNamespace(finetune_schedule="constant", finetune_lr=2e-5), 100), 2e-5)


class Negatives(unittest.TestCase):
    def test_synthetic_negatives_are_featureless_images(self):
        imgs = train.synthetic_negatives(50, seed=3)
        self.assertEqual(imgs.shape, (50, train.LOAD_SIZE, train.LOAD_SIZE, 3))
        self.assertEqual(imgs.dtype, np.uint8)
        means = imgs.reshape(50, -1).mean(1)
        self.assertTrue((means < 20).any() and (means > 230).any(), "includes near-black and near-white frames")

    def test_blank_inputs_cover_black_and_white(self):
        names, imgs = train.blank_inputs()
        self.assertIn("black", names)
        self.assertIn("white", names)
        self.assertEqual(imgs.shape[1:], (train.IMG_SIZE, train.IMG_SIZE, 3))
        self.assertEqual(imgs[names.index("black")].max(), 0)


if __name__ == "__main__":
    unittest.main()
