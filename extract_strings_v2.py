import os
import re
import json

# Configuration
SOURCE_DIR = "Frontend/src"
LOCALE_DIR = "Frontend/src/locales"

# Improved Regex: Targets JSX content inside tags >...<
# This looks for content between tags that contains letters, 
# avoiding snippets of code or logic inside brackets {}.
TEXT_REGEX = re.compile(r'>\s*([a-zA-Z0-9\s.,!?\'"-]{4,})\s*<')

def extract_strings(directory):
    catalog = {}
    for root, _, files in os.walk(directory):
        # Organize by directory name
        rel_path = os.path.relpath(root, directory)
        page_name = rel_path.replace(os.path.sep, '_').replace('.', 'common')
        if page_name == '.': page_name = 'common'
        
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    matches = TEXT_REGEX.findall(content)
                    for match in matches:
                        text = match.strip()
                        # Sanity check to avoid capturing code-like structures
                        if not any(c in text for c in ['{', '}', '=', '(', ')', ';']):
                            key = f"{page_name}.{text.lower().replace(' ', '_')[:20]}"
                            catalog[key] = text
    return catalog

def main():
    if not os.path.exists(LOCALE_DIR):
        os.makedirs(LOCALE_DIR)
        
    print("Extracting strings...")
    catalog = extract_strings(SOURCE_DIR)
    
    # Save EN
    with open(os.path.join(LOCALE_DIR, 'en.json'), 'w', encoding='utf-8') as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
    
    # Create basic AM
    with open(os.path.join(LOCALE_DIR, 'am.json'), 'w', encoding='utf-8') as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
    
    print(f"Extracted {len(catalog)} strings.")
    print("Check en.json and am.json. If satisfied, use replace_strings_safe.py")

if __name__ == "__main__":
    main()
