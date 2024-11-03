import os
import time

def play_ascii_frames(frames_dir, fps=10):
    frame_files = sorted([f for f in os.listdir(frames_dir) if f.endswith('.txt')])
    frame_delay = 1.0 / fps

    for frame_file in frame_files:
        with open(os.path.join(frames_dir, frame_file), 'r') as f:
            ascii_frame = f.read()
            os.system('clear')  # Use 'cls' if on Windows
            print(ascii_frame)
            time.sleep(frame_delay)

# Example usage
play_ascii_frames("ascii_frames", fps=10)