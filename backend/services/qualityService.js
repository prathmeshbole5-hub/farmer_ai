'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Resolves the dedicated Python virtual environment executable path.
 * @returns {string} Absolute path to python.exe or python
 */
function getPythonExecutablePath() {
  const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
  const winPythonPath = path.join(PROJECT_ROOT, 'ai', 'venv', 'Scripts', 'python.exe');
  const posixPythonPath = path.join(PROJECT_ROOT, 'ai', 'venv', 'bin', 'python');

  if (fs.existsSync(winPythonPath)) {
    return winPythonPath;
  }
  if (fs.existsSync(posixPythonPath)) {
    return posixPythonPath;
  }

  // Fallback check in .venv
  const fallbackWin = path.join(PROJECT_ROOT, 'ai', '.venv', 'Scripts', 'python.exe');
  if (fs.existsSync(fallbackWin)) {
    return fallbackWin;
  }

  return 'python';
}

/**
 * Grade produce quality (Fresh vs. Rotten) using the MobileNetV2 PyTorch model.
 *
 * @param {string} imagePath - Absolute path to the uploaded image file
 * @returns {Promise<{
 *   success: boolean,
 *   quality?: 'Fresh' | 'Rotten',
 *   class_id?: number,
 *   confidence?: number,
 *   probabilities?: { Fresh: number, Rotten: number },
 *   error?: string
 * }>}
 */
async function gradeProduceQuality(imagePath) {
  if (!imagePath || !fs.existsSync(imagePath)) {
    return {
      success: false,
      error: 'Image file not found on server.'
    };
  }

  const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
  const PYTHON_EXE = getPythonExecutablePath();
  const SCRIPT_PATH = path.join(PROJECT_ROOT, 'ai', 'prediction', 'quality_grader_api.py');
  const CHECKPOINT_PATH = path.join(PROJECT_ROOT, 'ai', 'models', 'quality_grader_mobilenetv2_best.pt');

  if (!fs.existsSync(CHECKPOINT_PATH)) {
    return {
      success: false,
      error: 'Quality Grader model checkpoint is unavailable. Please verify model setup.'
    };
  }

  if (!fs.existsSync(SCRIPT_PATH)) {
    return {
      success: false,
      error: 'Quality Grader inference script is missing.'
    };
  }

  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';
    let isSettled = false;

    const pythonProcess = spawn(
      PYTHON_EXE,
      [SCRIPT_PATH, imagePath],
      {
        cwd: PROJECT_ROOT,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
          PYTHONIOENCODING: 'utf-8'
        }
      }
    );

    // 30-second inference timeout
    const timeoutTimer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        pythonProcess.kill('SIGKILL');
        return resolve({
          success: false,
          error: 'Quality Grader inference timed out (30s limit exceeded).'
        });
      }
    }, 30000);

    pythonProcess.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    pythonProcess.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    pythonProcess.on('error', (err) => {
      clearTimeout(timeoutTimer);
      if (!isSettled) {
        isSettled = true;
        console.error('[QualityService Process Error]', err.message);
        return resolve({
          success: false,
          error: 'Failed to launch Quality Grader inference engine.'
        });
      }
    });

    pythonProcess.on('close', (code) => {
      clearTimeout(timeoutTimer);
      if (isSettled) return;
      isSettled = true;

      // Extract JSON line from stdout
      const lines = stdoutData.trim().split('\n');
      const jsonLine = lines.find((line) => line.trim().startsWith('{'));

      if (jsonLine) {
        try {
          const parsed = JSON.parse(jsonLine);
          if (parsed && typeof parsed.success !== 'undefined') {
            return resolve(parsed);
          }
        } catch (parseErr) {
          console.error('[QualityService JSON Parse Error]', parseErr.message);
        }
      }

      // Non-zero exit or unparseable output
      if (code !== 0) {
        console.error('[QualityService Process Stderr]', stderrData.trim());
        return resolve({
          success: false,
          error: 'Quality Grader inference process encountered an error.'
        });
      }

      return resolve({
        success: false,
        error: 'Unable to parse Quality Grader model prediction.'
      });
    });
  });
}

module.exports = {
  gradeProduceQuality,
  getPythonExecutablePath
};
