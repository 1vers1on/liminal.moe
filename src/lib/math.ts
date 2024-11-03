import FFT from "fft.js";

type Complex = [number, number]; // [real, imaginary]
type RealMatrix = number[][];
type ComplexMatrix = Complex[][];

let savedKernelFFT: ComplexMatrix | null = null;

export function fft2D(matrix: RealMatrix): ComplexMatrix {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const fft = new FFT(cols);
    let transformed: number[][] = new Array(rows);

    for (let i = 0; i < rows; i++) {
        const row = matrix[i];
        const inputRow = new Array(cols * 2).fill(0);
        const outputRow = new Array(cols * 2).fill(0);

        for (let j = 0; j < cols; j++) {
            inputRow[2 * j] = row[j];
            inputRow[2 * j + 1] = 0;
        }

        fft.transform(outputRow, inputRow);
        transformed[i] = outputRow;
    }

    const transposed: ComplexMatrix = Array.from({ length: cols }, (_, i) =>
        transformed.map((row) => [row[2 * i], row[2 * i + 1]]),
    );

    for (let i = 0; i < cols; i++) {
        const column = transposed[i];
        const inputColumn = new Array(rows * 2).fill(0);
        const outputColumn = new Array(rows * 2).fill(0);

        for (let j = 0; j < rows; j++) {
            inputColumn[2 * j] = column[j][0];
            inputColumn[2 * j + 1] = column[j][1];
        }

        fft.transform(outputColumn, inputColumn);

        for (let j = 0; j < rows; j++) {
            transposed[i][j] = [outputColumn[2 * j], outputColumn[2 * j + 1]];
        }
    }

    return Array.from({ length: rows }, (_, i) =>
        transposed.map((column) => column[i]),
    );
}

export function ifft2D(matrix: ComplexMatrix): ComplexMatrix {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const fft = new FFT(cols);
    let transformed: number[][] = new Array(rows);

    for (let i = 0; i < rows; i++) {
        const row = matrix[i];
        const inputRow = new Array(cols * 2).fill(0);
        const outputRow = new Array(cols * 2).fill(0);

        for (let j = 0; j < cols; j++) {
            inputRow[2 * j] = row[j][0];
            inputRow[2 * j + 1] = row[j][1];
        }

        fft.inverseTransform(outputRow, inputRow);
        transformed[i] = outputRow;
    }

    const transposed: ComplexMatrix = Array.from({ length: cols }, (_, i) =>
        transformed.map((row) => [row[2 * i], row[2 * i + 1]]),
    );

    for (let i = 0; i < cols; i++) {
        const column = transposed[i];
        const inputColumn = new Array(rows * 2).fill(0);
        const outputColumn = new Array(rows * 2).fill(0);

        for (let j = 0; j < rows; j++) {
            inputColumn[2 * j] = column[j][0];
            inputColumn[2 * j + 1] = column[j][1];
        }

        fft.inverseTransform(outputColumn, inputColumn);

        for (let j = 0; j < rows; j++) {
            transposed[i][j] = [outputColumn[2 * j], outputColumn[2 * j + 1]];
        }
    }

    const scaleFactor = rows * cols;
    return Array.from({ length: rows }, (_, i) =>
        transposed.map((column) => [
            column[i][0] / scaleFactor,
            column[i][1] / scaleFactor,
        ]),
    );
}

export function padKernel(
    kernel: RealMatrix,
    rows: number,
    cols: number,
): RealMatrix {
    const paddedKernel: RealMatrix = Array.from({ length: rows }, () =>
        Array(cols).fill(0),
    );
    const kernelRows = kernel.length;
    const kernelCols = kernel[0].length;

    const rowOffset = Math.floor((rows - kernelRows) / 2);
    const colOffset = Math.floor((cols - kernelCols) / 2);

    for (let i = 0; i < kernelRows; i++) {
        for (let j = 0; j < kernelCols; j++) {
            paddedKernel[i + rowOffset][j + colOffset] = kernel[i][j];
        }
    }

    return paddedKernel;
}

export function roll(
    grid: RealMatrix | ComplexMatrix,
    startRow: number,
    startCol: number,
): RealMatrix | ComplexMatrix {
    const rows = grid.length;
    const cols = grid[0].length;

    const newGrid: (number | Complex)[][] = Array.from({ length: rows }, () =>
        Array(cols).fill(0),
    );

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const newRow = (i - startRow + rows) % rows;
            const newCol = (j - startCol + cols) % cols;

            newGrid[newRow][newCol] = grid[i][j];
        }
    }

    return newGrid as RealMatrix | ComplexMatrix;
}

export function convolve2D(input: RealMatrix, kernel: RealMatrix): RealMatrix {
    const rows = input.length;
    const cols = input[0].length;

    const paddedKernel = padKernel(kernel, rows, cols);

    const inputFFT = fft2D(input);
    const kernelFFT = fft2D(paddedKernel);

    const resultFFT: ComplexMatrix = Array.from({ length: rows }, (_, i) =>
        Array.from({ length: cols }, (_, j) => {
            const [realA, imagA] = inputFFT[i][j];
            const [realB, imagB] = kernelFFT[i][j];
            return [
                realA * realB - imagA * imagB,
                realA * imagB + imagA * realB,
            ];
        }),
    );

    const result = ifft2D(resultFFT);
    const realResult: RealMatrix = Array.from({ length: rows }, () =>
        Array(cols).fill(0),
    );

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            realResult[i][j] = result[i][j][0] * rows * cols;
        }
    }
    return roll(
        realResult,
        Math.floor(rows / 2) - 1,
        Math.floor(cols / 2) - 1,
    ) as RealMatrix;
}

export function setKernel(
    kernel: RealMatrix,
    rows: number,
    cols: number,
): void {
    const paddedKernel = padKernel(kernel, rows, cols);
    savedKernelFFT = fft2D(paddedKernel);
}

export function convolve2DWithSavedKernel(input: RealMatrix): RealMatrix {
    if (!savedKernelFFT) {
        throw new Error("Kernel has not been set. Call setKernel first.");
    }

    const rows = input.length;
    const cols = input[0].length;

    const inputFFT = fft2D(input);

    const resultFFT: ComplexMatrix = Array.from({ length: rows }, (_, i) =>
        Array.from({ length: cols }, (_, j) => {
            const [realA, imagA] = inputFFT[i][j];
            const [realB, imagB] = savedKernelFFT![i][j];
            return [
                realA * realB - imagA * imagB,
                realA * imagB + imagA * realB,
            ];
        }),
    );

    const result = ifft2D(resultFFT);
    const realResult: RealMatrix = Array.from({ length: rows }, () =>
        Array(cols).fill(0),
    );

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            realResult[i][j] = result[i][j][0] * rows * cols;
        }
    }

    return roll(
        realResult,
        Math.floor(rows / 2) - 1,
        Math.floor(cols / 2) - 1,
    ) as RealMatrix;
}
