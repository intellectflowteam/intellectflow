import os
import shutil

base_dir = r"c:\Users\vaibh\Desktop\rajkot\intellectflow"
temp_dirs = ["bytebytego_system_design", "system_design_resources", "tech_interview_handbook", "technical_ebooks", "tech_handbooks_library"]

for td in temp_dirs:
    full_p = os.path.join(base_dir, td)
    if os.path.exists(full_p):
        try:
            shutil.rmtree(full_p, ignore_errors=True)
            print(f"Removed temp dir {td}")
        except Exception as e:
            print(f"Failed to remove {td}: {e}")
