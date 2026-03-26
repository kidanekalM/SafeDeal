import os
import json
import re

# Configuration
SOURCE_DIR = "Frontend/src"
LOCALE_FILE_EN = "Frontend/src/locales/en.json"

def get_translations():
    with open(LOCALE_FILE_EN, 'r', encoding='utf-8') as f:
        return json.load(f)["translation"]

def replace_in_files(translations):
    # Sort by length descending to replace longest strings first (avoids partial replacements)
    sorted_translations = sorted(translations.items(), key=lambda x: len(x[1]), reverse=True)
    
    for root, _, files in os.walk(SOURCE_DIR):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                for key, val in sorted_translations:
                    if len(val) > 4: # Min length threshold
                        # Only replace if it looks like a UI string: <div>val</div> or <p>val</p>
                        pattern = re.compile(f'>\s*{re.escape(val)}\s*<')
                        if pattern.search(new_content):
                            new_content = pattern.sub(f'>{{t("{key}")}}<', new_content)
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {path}")

def main():
    translations = get_translations()
    print(f"Replacing {len(translations)} strings...")
    replace_in_files(translations)
    print("Replacement complete.")

if __name__ == "__main__":
    main()
