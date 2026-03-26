import os
import re
import json

# Configuration
SOURCE_DIR = "Frontend/src"
LOCALE_FILE_EN = "Frontend/src/locales/en.json"
LOCALE_FILE_AM = "Frontend/src/locales/am.json"
# Regex to match strings in JSX, e.g., <div>Hello World</div> or <p>Title</p>
# It excludes common tags like script, style, and self-closing components
TEXT_REGEX = re.compile(r'>([^<>{]+?)<')

def extract_strings(directory):
    strings = {}
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    matches = TEXT_REGEX.findall(content)
                    for match in matches:
                        text = match.strip()
                        if len(text) > 3 and not text.startswith('{'):
                            key = "_".join(text.lower().split()[:3])
                            strings[key] = text
    return strings

def main():
    print("Extracting strings...")
    all_strings = extract_strings(SOURCE_DIR)
    
    # Save to JSON
    with open(LOCALE_FILE_EN, 'w', encoding='utf-8') as f:
        json.dump({"translation": all_strings}, f, indent=2, ensure_ascii=False)
    
    print(f"Extracted {len(all_strings)} strings to {LOCALE_FILE_EN}")
    print("Please review the JSON, then we can automate the replacement.")

if __name__ == "__main__":
    main()
