
import os
import re

file_path = r'd:\\My projects\\svr\\SVR-dashboard\\index.html'

def read_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def write_file(path, content):
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

content = read_file(file_path)

# --- 1. Extract the Material Calculation Section ---
# This regex looks for the section block starting with the ID and ending with </section>
# We use re.DOTALL so . matches newlines
section_pattern = re.compile(r'<section id="material-calculation".*?</section>', re.DOTALL)
match = section_pattern.search(content)

if not match:
    print("Section id='material-calculation' not found.")
    exit(1)

full_section_content = match.group(0)

# Remove the section from the main content
content = content.replace(full_section_content, '')
print("Removed 'material-calculation' section.")


# --- 2. Remove Sidebar Link ---
# Finds the list item containing the link to #material-calculation
sidebar_pattern = re.compile(r'<li class="nav-item">\s*<a href="#material-calculation".*?</a>\s*</li>', re.DOTALL)
if sidebar_pattern.search(content):
    content = sidebar_pattern.sub('', content)
    print("Removed sidebar link.")
else:
    print("Sidebar link not found.")


# --- 3. Prepare Content for New Tab ---
# Remove the <section> tags and the page header from the extracted content
# We want the inner content, but without the header
inner_content = full_section_content
# Remove <section...> and </section>
inner_content = re.sub(r'<section id="material-calculation".*?>', '', inner_content)
inner_content = re.sub(r'</section>', '', inner_content)

# Remove the page header div
header_pattern = re.compile(r'<div class="page-header">.*?</div>', re.DOTALL)
inner_content = header_pattern.sub('', inner_content)

# Wrap in the new tab div
new_tab_content = f"""
                <!-- Costing & P/L Tab -->
                <div id="costingContent" style="display: none;">
{inner_content}
                </div>
"""


# --- 4. Insert New Tab Content into Materials Section ---
# We need to find the end of the Materials section to insert our new tab content
# The Materials section has id="materials"
# We'll look for the LAST </div> inside the section, or just append before </section>
# Assuming the structure is <section id="materials"> ... </section>
materials_section_pattern = re.compile(r'(<section id="materials".*?)(</section>)', re.DOTALL)
materials_match = materials_section_pattern.search(content)

if materials_match:
    # We want to insert before the closing </section> of this specific match
    # However, regex group 1 captures everything up to the closing tag.
    # It's safer to use string replacement on the unique closing tag if we can identify it,
    # or just use the match object span.
    
    start, end = materials_match.span()
    section_text = materials_match.group(0)
    
    # We want to insert before the last </section> in this text
    last_closing_tag_index = section_text.rfind('</section>')
    
    updated_section_text = section_text[:last_closing_tag_index] + new_tab_content + section_text[last_closing_tag_index:]
    
    # Replace the old section text with the updated one
    content = content[:start] + updated_section_text + content[end:]
    print("Inserted new tab content into 'materials' section.")
else:
    print("Materials section not found.")
    exit(1)


# --- 5. Add Tab Button ---
# Find the existing tabs in the materials section
# We look for the "Material Calculator" button
tab_button_pattern = re.compile(r'(<button id="materialCalcTab".*?</button>)', re.DOTALL)
tab_btn_match = tab_button_pattern.search(content)

if tab_btn_match:
    existing_btn = tab_btn_match.group(1)
    new_btn = """
                    <button id="costingTab" class="material-tab" onclick="switchMaterialTab('costing')"
                        style="padding: 0.75rem 1.5rem; border: none; background: none; cursor: pointer; font-weight: 600; color: var(--text-secondary); border-bottom: 3px solid transparent; transition: all 0.3s;">
                        💰 Costing & P/L
                    </button>"""
    
    # Insert after the existing button
    content = content.replace(existing_btn, existing_btn + new_btn)
    print("Added 'Costing & P/L' tab button.")
else:
    print("Tab button 'materialCalcTab' not found.")

write_file(file_path, content)
print("Done.")
