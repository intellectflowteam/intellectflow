import os
import shutil
import glob

base_dir = r"c:\Users\vaibh\Desktop\rajkot\intellectflow"
target_root = os.path.join(base_dir, "TECH_HANDBOOKS_LIBRARY")

categories = {
    "01_System_Design_&_Architecture": ["system", "design", "architecture", "microservices", "distributed", "scalability", "load-balancer", "cdn"],
    "02_Data_Structures_&_Algorithms": ["dsa", "algorithm", "tree", "graph", "dynamic-programming", "sorting", "array"],
    "03_Low_Level_Design_&_OOP": ["lld", "object-oriented", "design-pattern", "solid", "uml"],
    "04_Backend_Node_Java_Python": ["node", "express", "java", "spring", "python", "backend", "api", "rest", "graphql"],
    "05_Frontend_React_JS_Web": ["react", "javascript", "js", "typescript", "frontend", "html", "css", "nextjs"],
    "06_DevOps_Docker_Kafka_Redis": ["docker", "kubernetes", "kafka", "redis", "devops", "ci-cd", "aws"],
    "07_DBMS_&_SQL": ["dbms", "sql", "database", "postgres", "mongodb", "mysql"],
    "08_Tech_Interview_Cheatsheets": ["interview", "cheatsheet", "handbook", "guide", "notes", "quiz"]
}

os.makedirs(target_root, exist_ok=True)
for cat in categories.keys():
    os.makedirs(os.path.join(target_root, cat), exist_ok=True)

source_dirs = ["bytebytego_system_design", "system_design_resources", "tech_interview_handbook", "technical_ebooks", "tech_handbooks_library"]

copied_count = 0

for s_dir in source_dirs:
    full_s_dir = os.path.join(base_dir, s_dir)
    if not os.path.exists(full_s_dir):
        continue
    
    for root, dirs, files in os.walk(full_s_dir):
        if ".git" in root:
            continue
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in [".pdf", ".epub", ".png", ".jpg", ".md"]:
                # skip readme or licenses unless relevant
                if f.lower() in ["readme.md", "license", "license.md", "code_of_conduct.md", "contributing.md"]:
                    continue
                
                src_path = os.path.join(root, f)
                rel_name = f.lower()
                
                matched_cat = "08_Tech_Interview_Cheatsheets"
                for cat, keywords in categories.items():
                    if any(k in rel_name or k in root.lower() for k in keywords):
                        matched_cat = cat
                        break
                
                dest_dir = os.path.join(target_root, matched_cat)
                dest_path = os.path.join(dest_dir, f)
                
                if not os.path.exists(dest_path):
                    try:
                        shutil.copy2(src_path, dest_path)
                        copied_count += 1
                    except Exception as e:
                        pass

print(f"Organized {copied_count} files into TECH_HANDBOOKS_LIBRARY!")
