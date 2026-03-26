import os
import re

# Directory of components to update
SOURCE_DIR = "Frontend/src"

def process_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Skip if useTranslation is already imported
    if "useTranslation" in content:
        return

    # Check if file uses JSX
    if "<" not in content:
        return

    # 1. Add import
    if "import { useTranslation } from 'react-i18next';" not in content:
        import_stmt = "import { useTranslation } from 'react-i18next';\n"
        # Find the first import statement and insert after it
        content = re.sub(r'import .*\n', lambda m: m.group(0) + import_stmt if 'import ' in m.group(0) else m.group(0), content, count=1)

    # 2. Add hook declaration
    # Find the function component declaration (arrow function or function declaration)
    component_match = re.search(r'const \w+ = \([^)]*\) => \{', content)
    if component_match:
        hook_stmt = "\n  const { t } = useTranslation();"
        # Insert hook after the function opening brace
        content = content.replace(component_match.group(0), component_match.group(0) + hook_stmt)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {path}")

def main():
    for root, _, files in os.walk(SOURCE_DIR):
        for file in files:
            if file.endswith(('.tsx')):
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
