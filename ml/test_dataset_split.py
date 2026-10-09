import csv
import re
import unittest
from pathlib import Path
from dataset_split import split_group_indices


class DatasetSplitTests(unittest.TestCase):
    def check_split(self, labels, groups, seed):
        training, validation = split_group_indices(labels, groups, 0.2, seed)
        self.assertFalse({groups[i] for i in training} & {groups[i] for i in validation})
        self.assertEqual(set(training) | set(validation), set(range(len(labels))))
        self.assertEqual({labels[i] for i in training}, set(labels))
        self.assertEqual({labels[i] for i in validation}, set(labels))
        self.assertEqual((training, validation), split_group_indices(labels, groups, 0.2, seed))

    def test_video_shared_by_classes_stays_on_one_side(self):
        labels = ['a', 'b'] * 12
        groups = ['shared'] * 4 + [f'photo-{i}' for i in range(20)]
        for seed in [1, 2, 42]:
            self.check_split(labels, groups, seed)

    def test_committed_catalog_has_no_leakage_across_seeds(self):
        with (Path(__file__).parent / 'labels.csv').open(newline='', encoding='utf-8') as source:
            rows = list(csv.DictReader(source))
        pattern = re.compile(r'^video/[^/]+/(.+)_\d{5}\.jpg$')
        labels = [row['label'] for row in rows]
        groups = []
        for row in rows:
            match = pattern.match(row['filename'])
            groups.append('video:' + match.group(1) if match else row['filename'])
        for seed in [1, 2, 42]:
            self.check_split(labels, groups, seed)

    def test_few_large_groups_can_still_provide_holdout(self):
        self.check_split(['a'] * 10, ['video-a'] * 5 + ['video-b'] * 5, 42)

    def test_unsplittable_classes_fail_instead_of_leaking(self):
        with self.assertRaises(ValueError):
            split_group_indices(['a', 'a'], ['same-video', 'same-video'], 0.2, 42)
        with self.assertRaises(ValueError):
            split_group_indices(['a'], [], 0.2, 42)


if __name__ == '__main__':
    unittest.main()
