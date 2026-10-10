"""Pure policies shared by the worker and Blender-free regression tests."""
import math

REDUCTION_TOLERANCE_MM = 0.5  # Reserve ample room for export/16-bit quantization.
SMALL_TRIANGLE_COUNT = 100


def transform_rows(transform):
    """Body-local transform schema: row-major 3x3 + translation, or 4x4.
    Top-level source.transform is archival provenance: positions already include it.
    """
    if transform is None:
        return [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]]
    matrix = transform.get('matrix') if isinstance(transform, dict) else transform
    translation = transform.get('translation', [0,0,0]) if isinstance(transform, dict) else [0,0,0]
    if len(matrix)==3 and all(len(row)==3 for row in matrix):
        matrix = [list(row)+[translation[i]] for i,row in enumerate(matrix)]+[[0,0,0,1]]
    elif len(matrix)==4 and all(len(row)==4 for row in matrix):
        matrix = [list(row) for row in matrix]
    else:
        raise ValueError('Unsupported body transform; expected row-major 3x3/4x4')
    if not all(math.isfinite(x) for row in matrix for x in row) or matrix[3]!=[0,0,0,1]:
        raise ValueError('Body transform must be finite affine matrix')
    return matrix


def bounds_changed(before, after, tolerance=REDUCTION_TOLERANCE_MM):
    return after is None or any(abs(before[j][i]-after[j][i]) > tolerance
                                for j in range(2) for i in range(3))
