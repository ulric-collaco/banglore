function vandermondeMatrix(xs, degree) {
  return xs.map((x) => Array.from({ length: degree + 1 }, (_, power) => x ** power));
}

function transpose(matrix) {
  return matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]));
}

function matMul(A, B) {
  return A.map((row) =>
    B[0].map((_, columnIndex) => row.reduce((sum, value, rowIndex) => sum + value * B[rowIndex][columnIndex], 0))
  );
}

function gaussianElimination(A, b) {
  const matrix = A.map((row, index) => [...row, b[index]]);
  const n = matrix.length;

  for (let pivot = 0; pivot < n; pivot += 1) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < n; row += 1) {
      if (Math.abs(matrix[row][pivot]) > Math.abs(matrix[maxRow][pivot])) maxRow = row;
    }
    [matrix[pivot], matrix[maxRow]] = [matrix[maxRow], matrix[pivot]];

    const pivotValue = matrix[pivot][pivot] || 1e-12;
    for (let column = pivot; column <= n; column += 1) matrix[pivot][column] /= pivotValue;

    for (let row = 0; row < n; row += 1) {
      if (row === pivot) continue;
      const factor = matrix[row][pivot];
      for (let column = pivot; column <= n; column += 1) {
        matrix[row][column] -= factor * matrix[pivot][column];
      }
    }
  }

  return matrix.map((row) => row[n]);
}

export function predict(x, coefficients) {
  return coefficients.reduce((sum, coefficient, power) => sum + coefficient * x ** power, 0);
}

export function findPeakHour(coefficients) {
  let peakHour = 0;
  let peakValue = -Infinity;
  for (let hour = 0; hour < 24; hour += 1) {
    const value = predict(hour, coefficients);
    if (value > peakValue) {
      peakValue = value;
      peakHour = hour;
    }
  }
  return peakHour;
}

export function findOffPeakWindow(coefficients) {
  let bestStart = 0;
  let bestMean = Infinity;
  for (let start = 0; start <= 20; start += 1) {
    const mean = [0, 1, 2, 3].reduce((sum, offset) => sum + predict(start + offset, coefficients), 0) / 4;
    if (mean < bestMean) {
      bestMean = mean;
      bestStart = start;
    }
  }
  return { start: bestStart, end: bestStart + 3 };
}

export function polynomialRegression(xs, ys, degree = 3) {
  const X = vandermondeMatrix(xs, degree);
  const XT = transpose(X);
  const XTX = matMul(XT, X);
  const yColumn = ys.map((value) => [value]);
  const XTy = matMul(XT, yColumn).map(([value]) => value);
  const coefficients = gaussianElimination(XTX, XTy);
  const predicted = xs.map((x) => Math.max(0, Math.min(1, predict(x, coefficients))));
  const meanY = ys.reduce((sum, value) => sum + value, 0) / ys.length;
  const ssRes = ys.reduce((sum, value, index) => sum + (value - predicted[index]) ** 2, 0);
  const ssTot = ys.reduce((sum, value) => sum + (value - meanY) ** 2, 0);

  return {
    coefficients,
    r_squared: ssTot === 0 ? 1 : 1 - ssRes / ssTot,
    predicted,
    peak_hour: findPeakHour(coefficients),
    offpeak_window: findOffPeakWindow(coefficients)
  };
}

export { vandermondeMatrix, transpose, matMul, gaussianElimination };
