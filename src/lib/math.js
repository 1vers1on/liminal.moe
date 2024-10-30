import FFT from "fft.js";

let savedKernelFFT = null;

export function fft2D(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const fft = new FFT(cols);
    let transformed = new Array(rows);

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

    const transposed = Array.from({ length: cols }, (_, i) =>
        transformed.map(row => [row[2 * i], row[2 * i + 1]])
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
        transposed.map(column => column[i])
    );
}

export function ifft2D(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const fft = new FFT(cols);
    let transformed = new Array(rows);

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

    const transposed = Array.from({ length: cols }, (_, i) =>
        transformed.map(row => [row[2 * i], row[2 * i + 1]])
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
        transposed.map(column => [
            column[i][0] / scaleFactor,
            column[i][1] / scaleFactor
        ])
    );
}

export function padKernel(kernel, rows, cols) {
    const paddedKernel = Array.from({ length: rows }, () => Array(cols).fill(0));
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

export function roll(grid, startRow, startCol) {
    const rows = grid.length;
    const cols = grid[0].length;

    const newGrid = Array.from({ length: rows }, () => new Array(cols).fill(0));

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const newRow = (i - startRow + rows) % rows;
            const newCol = (j - startCol + cols) % cols;

            newGrid[newRow][newCol] = grid[i][j];
        }
    }

    return newGrid;
}


export function convolve2D(input, kernel) {
    const rows = input.length;
    const cols = input[0].length;

    const paddedKernel = padKernel(kernel, rows, cols);

    const inputFFT = fft2D(input);
    const kernelFFT = fft2D(paddedKernel);

    const resultFFT = Array.from({ length: rows }, (_, i) =>
        Array.from({ length: cols }, (_, j) => {
            const [realA, imagA] = inputFFT[i][j];
            const [realB, imagB] = kernelFFT[i][j];
            return [
                realA * realB - imagA * imagB,
                realA * imagB + imagA * realB
            ];
        })
    );

    const result = ifft2D(resultFFT);

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            result[i][j] = result[i][j][0] * rows * cols;
        }
    }
    return roll(result, Math.floor(rows / 2) - 1, Math.floor(cols / 2) - 1);
}

export function setKernel(kernel, rows, cols) {
    const paddedKernel = padKernel(kernel, rows, cols);
    savedKernelFFT = fft2D(paddedKernel);
}

export function convolve2DWithSavedKernel(input) {
    const rows = input.length;
    const cols = input[0].length;

    const inputFFT = fft2D(input);

    const resultFFT = Array.from({ length: rows }, (_, i) =>
        Array.from({ length: cols }, (_, j) => {
            const [realA, imagA] = inputFFT[i][j];
            const [realB, imagB] = savedKernelFFT[i][j];
            return [
                realA * realB - imagA * imagB,
                realA * imagB + imagA * realB
            ];
        })
    );

    const result = ifft2D(resultFFT);

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            result[i][j] = result[i][j][0] * rows * cols;
        }
    }

    return roll(result, Math.floor(rows / 2) - 1, Math.floor(cols / 2) - 1);
}
    
