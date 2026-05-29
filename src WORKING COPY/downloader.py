import os
import urllib.parse
from playwright.sync_api import sync_playwright

def download_urls_as_pdf(url_file_path, output_directory):
    if not os.path.exists(output_directory):
        os.makedirs(output_directory)

    try:
        with open(url_file_path, 'r', encoding='utf-8') as file:
            urls = [line.strip() for line in file if line.strip()]
    except FileNotFoundError:
        print(f"Error: The file '{url_file_path}' was not found.")
        return

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        for index, url in enumerate(urls, 1):
            try:
                parsed_url = urllib.parse.urlparse(url)
                safe_filename = parsed_url.netloc + parsed_url.path.replace('/', '_')
                safe_filename = safe_filename.strip('_')
                safe_filename += str(index)
                if not safe_filename.endswith('.pdf'):
                    safe_filename += '.pdf'

                output_path = os.path.join(output_directory, safe_filename)

                print(f"Converting ({index}): {url}")
                page.goto(url, wait_until="networkidle", timeout=30000)
                page.pdf(path=output_path, format="A4", print_background=True)
                print(f"Success -> Saved as {safe_filename}\n")

            except Exception as e:
                print(f"Failed to process {url}.")
                print(f"Error details: {e}\n")

        browser.close()

if __name__ == "__main__":
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
    INPUT_FILE = os.path.join(PROJECT_ROOT, "notes", "medicare-urls.txt")
    OUTPUT_FOLDER = os.path.join(PROJECT_ROOT, "policies", "medicare")

    download_urls_as_pdf(INPUT_FILE, OUTPUT_FOLDER)