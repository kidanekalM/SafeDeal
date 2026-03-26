import os
import json
import re

# Configuration
SOURCE_DIR = "Frontend/src"
LOCALE_FILE_EN = "Frontend/src/locales/en.json"

def get_translations():
    with open(LOCALE_FILE_EN, 'r', encoding='utf-8') as f:
        return json.load(f)

def replace_in_files(translations):
    # Filter out empty keys
    clean_translations = {k: v for k, v in translations.items() if v and len(v) > 4}
    
    # Sort by length descending
    sorted_translations = sorted(clean_translations.items(), key=lambda x: len(x[1]), reverse=True)
    
    for root, _, files in os.walk(SOURCE_DIR):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                for key, val in sorted_translations:
                    # Pattern matches content wrapped in > < only, not inside props
                    # We check for >text< exactly, ensuring we don't accidentally match JSX tags
                    pattern = re.compile(f'>{re.escape(val)}<')
                    if pattern.search(new_content):
                        new_content = pattern.sub(f'>{{t("{key}")}}<', new_content)
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {path}")

def main():
    data = get_translations()
    # Handle the structure where all keys are under "translation"
    translations = data.get("translation", data)
    print(f"Replacing {len(translations)} strings...")
    replace_in_files(translations)
    print("Replacement complete.")

if __name__ == "__main__":
    main()
