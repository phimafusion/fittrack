import os
import re

def bump_version():
    index_path = 'index.html'
    sw_path = 'sw.js'
    
    if not os.path.exists(index_path) or not os.path.exists(sw_path):
        print("Error: index.html or sw.js not found in current directory.")
        return

    # Read index.html
    with open(index_path, 'r', encoding='utf-8') as f:
        index_content = f.read()
        
    # Read sw.js
    with open(sw_path, 'r', encoding='utf-8') as f:
        sw_content = f.read()

    # Find current version in index.html (e.g. css/style.css?v=27)
    match = re.search(r'\?v=(\d+)', index_content)
    if not match:
        print("Error: Could not find version pattern '?v=XX' in index.html.")
        return
        
    current_version = int(match.group(1))
    new_version = current_version + 1
    
    print(f"Bumping version from {current_version} to {new_version}...")
    
    # Replace in index.html
    new_index_content = re.sub(rf'\?v={current_version}', f'?v={new_version}', index_content)
    
    # Replace in sw.js (e.g. fittrack-cache-v27)
    new_sw_content = re.sub(rf'fittrack-cache-v{current_version}', f'fittrack-cache-v{new_version}', sw_content)
    
    # Write back
    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(new_index_content)
        
    with open(sw_path, 'w', encoding='utf-8') as f:
        f.write(new_sw_content)
        
    print(f"Successfully bumped version to {new_version} in index.html and sw.js.")

if __name__ == '__main__':
    bump_version()
