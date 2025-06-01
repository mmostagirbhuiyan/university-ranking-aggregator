import re
import pandas as pd
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def parse_usnews_text(text, max_rank=500, output_file='usnews_global_universities_top500.csv'):
    logging.info("Starting text parsing process")
    universities = []
    rank_count = 0

    # Split text into lines and remove empty lines
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    i = 0
    while i < len(lines) and rank_count < max_rank:
        # Detect university name (not a metadata line or field label)
        if not lines[i].startswith(('#', 'Global Score', 'Enrollment', 'http', 'Hi there', '5/31/25', 'Read More')) and \
           not re.match(r'^\w+$', lines[i]) and \
           '|' not in lines[i] and \
           not lines[i].startswith(('BEST COLLEGES', 'Savor Seoul', 'EDUCATION', 'Home /', '2024-2025 Best', 'These institutions', 'To unlock', 'Summary', 'POWERED BY', 'Canada China', 'Load More', 'Copyright 2025')):
            university = lines[i].strip()
            i += 1

            # Extract country (line with | separator)
            country = 'N/A'
            if i < len(lines) and '|' in lines[i]:
                country = lines[i].split('|')[0].strip()
                i += 1

            # Extract rank (line starting with #)
            rank = None
            if i < len(lines) and lines[i].startswith('#'):
                rank_text = re.sub(r'\s*\(tie\).*', '', lines[i])  # Remove (tie)
                rank_text = re.sub(r'#(\d+).*', r'\1', rank_text)  # Extract number
                try:
                    rank = int(rank_text)
                except ValueError:
                    logging.warning("Invalid rank format: %s", lines[i])
                    i += 1
                    continue
                i += 1

            # Skip "in Best Global Universities"
            if i < len(lines) and 'in Best Global Universities' in lines[i]:
                i += 1

            # Extract score (Global Score followed by value)
            score = 'N/A'
            if i < len(lines) and lines[i] == 'Global Score':
                i += 1
                if i < len(lines) and re.match(r'^\d+\.\d+$', lines[i]):
                    score = lines[i]
                    i += 1

            # Extract enrollment
            enrollment = 'N/A'
            if i < len(lines) and lines[i] == 'Enrollment':
                i += 1
                if i < len(lines):
                    enrollment = lines[i].replace(',', '')  # Remove commas
                    i += 1

            # Validate entry
            if rank and university != 'N/A':
                universities.append({
                    'Rank': rank,
                    'University': university,
                    'Country': country,
                    'Score': score,
                    'Enrollment': enrollment
                })
                rank_count += 1
                logging.info("Extracted university #%d: %s (Rank: %d)", rank_count, university, rank)
            else:
                logging.warning("Skipping incomplete entry at line %d: %s", i, university)

        else:
            i += 1

    if not universities:
        logging.warning("No universities extracted. Check text format.")
        return

    # Save to CSV
    logging.info("Saving %d universities to CSV", len(universities))
    df = pd.DataFrame(universities)
    df.to_csv(output_file, index=False)
    logging.info("Data saved to %s with columns: %s", output_file, ', '.join(df.columns))

if __name__ == "__main__":
    # Example: Read text from a file (replace with your text or file path)
    input_file = "usnews_rankings.txt"  # Save your PDF text here
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            text = f.read()
        logging.info("Parsing U.S. News Best Global Universities Rankings from text...")
        parse_usnews_text(text, max_rank=500)
        logging.info("Parsing complete!")
    except FileNotFoundError:
        logging.error("Input file %s not found. Please provide the text file.", input_file)