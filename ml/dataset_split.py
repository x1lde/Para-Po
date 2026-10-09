"""Deterministic class-aware holdout with indivisible source groups."""
import random
from collections import Counter, defaultdict


def split_group_indices(labels, groups, val_fraction, seed):
    if len(labels) != len(groups) or not 0 < val_fraction < 1:
        raise ValueError("Labels/groups must align and validation fraction must be between 0 and 1")
    by_group = defaultdict(list)
    for index, group in enumerate(groups):
        by_group[group].append(index)
    totals = Counter(labels)
    remaining = dict(totals)
    held_out = Counter()
    targets = {label: max(1, round(total * val_fraction)) for label, total in totals.items()}
    keys = list(by_group)
    random.Random(seed).shuffle(keys)
    validation = set()
    for group in keys:
        indices = by_group[group]
        counts = Counter(labels[index] for index in indices)
        # Keep training examples for every class. Prioritize covering classes
        # absent from validation, then improve the per-class holdout targets.
        if any(remaining[label] <= count for label, count in counts.items()):
            continue
        improvement = sum(abs(targets[label] - held_out[label]) -
                          abs(targets[label] - held_out[label] - count)
                          for label, count in counts.items())
        if improvement <= 0 and all(held_out[label] for label in counts):
            continue
        validation.update(indices)
        held_out.update(counts)
        for label, count in counts.items():
            remaining[label] -= count
    if not validation or any(not held_out[label] for label in totals):
        raise ValueError("Cannot split source groups while retaining training and validation examples for every class")
    training = set(range(len(labels))) - validation
    return sorted(training), sorted(validation)
