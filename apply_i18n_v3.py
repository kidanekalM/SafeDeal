import os
import json
import re

# Configuration
SOURCE_DIR = "Frontend/src"
LOCALE_FILE_EN = "Frontend/src/locales/en.json"

def flatten_json(y):
    out = {}

    def flatten(x, name=''):
        if type(x) is dict:
            for a in x:
                flatten(x[a], name + a + '.')
        elif type(x) is list:
            i = 0
            for a in x:
                flatten(a, name + str(i) + '.')
                i += 1
        else:
            out[name[:-1]] = x

    flatten(y)
    return out

def get_translations():
    with open(LOCALE_FILE_EN, 'r', encoding='utf-8') as f:
        data = json.load(f)
        return flatten_json(data.get("translation", data))

def replace_in_files(translations):
    # Filter and sort by value length descending
    # We want to replace longest strings first
    items = sorted(translations.items(), key=lambda x: len(str(x[1])), reverse=True)
    
    for root, _, files in os.walk(SOURCE_DIR):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                new_content = content
                for key, val in items:
                    if not val or len(str(val)) < 2:
                        continue
                    
                    # Pattern 1: >Text< -> >{t("key")}<
                    pattern1 = re.compile(f'>\s*{re.escape(str(val))}\s*<')
                    if pattern1.search(new_content):
                        new_content = pattern1.sub(f'>{{t("{key}")}}<', new_content)
                    
                    # Pattern 2: "Text" -> {t("key")} inside props if it matches exactly
                    # Example: placeholder="Search" -> placeholder={t("key")}
                    pattern2 = re.compile(f'="\s*{re.escape(str(val))}\s*"')
                    if pattern2.search(new_content):
                        new_content = pattern2.sub(f'={{{t("{key}")}}}', new_content)

                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Updated {path}")

def main():
    print("Loading translations...")
    translations = get_translations()
    print(f"Loaded {len(translations)} unique strings.")
    print("Replacing in files...")
    replace_in_files(translations)
    print("Complete.")

if __name__ == "__main__":
    main()
