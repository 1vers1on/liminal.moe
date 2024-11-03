import cv2
import os
import json

def video_to_ascii(video_path, output_json="ascii_frames.json", width=100, fps=10):
    # Open video
    cap = cv2.VideoCapture(video_path)
    original_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = max(int(original_fps / fps), 1)

    frame_count = 0
    saved_frame = 0

    # ASCII characters for black and white
    ascii_chars = ['  ', '##']  # ' ' for black, '#' for white

    # Dictionary to hold ASCII frames
    ascii_frames = {}

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

            # Add ASCII frame to dictionary
            ascii_frames[f"frame_{saved_frame}"] = ascii_frame
            saved_frame += 1

        frame_count += 1

    cap.release()

    # Save ASCII frames to a JSON file
    with open(output_json, "w") as json_file:
        json.dump(ascii_frames, json_file, indent=4)

# Example usage
video_to_ascii("badapple.mp4", output_json="ascii_frames.json", width=50, fps=10)
