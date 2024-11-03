import cv2
import os

def video_to_ascii(video_path, output_dir="ascii_frames", width=100, fps=10):
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Open video
    cap = cv2.VideoCapture(video_path)
    original_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = max(int(original_fps / fps), 1)

    frame_count = 0
    saved_frame = 0

    # ASCII characters for black and white
    ascii_chars = ['  ', '##']  # ' ' for black, '#' for white

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count % frame_interval == 0:
            # Calculate new dimensions to maintain aspect ratio
            aspect_ratio = frame.shape[1] / frame.shape[0]
            height = int(width / aspect_ratio)

            # Resize frame while maintaining aspect ratio
            frame_resized = cv2.resize(frame, (width, height))

            # Convert to grayscale
            gray = cv2.cvtColor(frame_resized, cv2.COLOR_BGR2GRAY)

            # Threshold to get black and white image
            _, bw = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)

            # Convert pixels to ASCII characters
            ascii_frame = ""
            for row in bw:
                for pixel in row:
                    ascii_frame += ascii_chars[pixel // 255]
                ascii_frame += "\n"

            # Save ASCII frame to file
            with open(os.path.join(output_dir, f"frame_{saved_frame}.txt"), "w") as f:
                f.write(ascii_frame)

            saved_frame += 1

        frame_count += 1

    cap.release()

# Example usage
video_to_ascii("badapple.mp4", width=50, fps=10)
