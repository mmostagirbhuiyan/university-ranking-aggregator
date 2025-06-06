#!/usr/bin/env python3
"""
Polished US News Global University Rankings CSV Extractor
Updated to produce clean, consistent output format
"""

import time
import logging
import argparse
import sys
import re
import pandas as pd
from pathlib import Path
from typing import List, Dict, Optional
import json

# Selenium imports
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options as ChromeOptions
    from selenium.webdriver.firefox.options import Options as FirefoxOptions
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("Warning: Selenium not available. Install with: pip install selenium")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('usnews_extractor.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

class USNewsPolishedExtractor:
    def __init__(self, browser='chrome', headless=True, max_entries=500, debug=False):
        if not SELENIUM_AVAILABLE:
            raise ImportError("Selenium is required. Install with: pip install selenium")
        
        self.browser = browser.lower()
        self.headless = headless
        self.driver = None
        self.max_entries = max_entries
        self.debug = debug
        self.universities = []
        
        # US News Global Rankings URL
        self.base_url = "https://www.usnews.com/education/best-global-universities/rankings"
        
        # Country mapping for common locations to standardize country names
        self.country_mapping = {
            'cambridge (u.s.)': 'United States',
            'cambridge': 'United States',
            'stanford': 'United States',
            'new haven': 'United States',
            'princeton': 'United States',
            'berkeley': 'United States',
            'los angeles': 'United States',
            'ann arbor': 'United States',
            'seattle': 'United States',
            'philadelphia': 'United States',
            'chicago': 'United States',
            'boston': 'United States',
            'new york': 'United States',
            'baltimore': 'United States',
            'atlanta': 'United States',
            'durham': 'United States',
            'ithaca': 'United States',
            'oxford': 'United Kingdom',
            'cambridge (u.k.)': 'United Kingdom',
            'london': 'United Kingdom',
            'edinburgh': 'United Kingdom',
            'glasgow': 'United Kingdom',
            'toronto': 'Canada',
            'vancouver': 'Canada',
            'montreal': 'Canada',
            'sydney': 'Australia',
            'melbourne': 'Australia',
            'canberra': 'Australia',
            'zurich': 'Switzerland',
            'beijing': 'China',
            'shanghai': 'China',
            'hong kong': 'Hong Kong',
            'singapore': 'Singapore',
            'tokyo': 'Japan',
            'kyoto': 'Japan',
            'munich': 'Germany',
            'berlin': 'Germany',
            'heidelberg': 'Germany',
            'paris': 'France',
            'stockholm': 'Sweden',
            'copenhagen': 'Denmark',
            'oslo': 'Norway',
            'helsinki': 'Finland',
            'amsterdam': 'Netherlands',
            'utrecht': 'Netherlands',
            'milan': 'Italy',
            'rome': 'Italy',
            'madrid': 'Spain',
            'barcelona': 'Spain',
            'vienna': 'Austria',
            'brussels': 'Belgium',
            'tel aviv': 'Israel',
            'jerusalem': 'Israel',
            'seoul': 'South Korea',
            'taipei': 'Taiwan',
            'mumbai': 'India',
            'delhi': 'India',
            'bangalore': 'India',
            'são paulo': 'Brazil',
            'rio de janeiro': 'Brazil',
            'mexico city': 'Mexico'
        }
        
    def setup_driver(self):
        """Initialize the browser driver"""
        logging.info(f"Setting up {self.browser} driver (headless: {self.headless})")
        
        try:
            if self.browser == 'chrome':
                self.driver = self._setup_chrome()
            elif self.browser == 'firefox':
                self.driver = self._setup_firefox()
            else:
                raise ValueError("Browser must be 'chrome' or 'firefox'")
                
            logging.info("Browser driver initialized successfully")
            
        except Exception as e:
            logging.error(f"Failed to setup browser driver: {e}")
            raise

    def _setup_chrome(self):
        """Setup Chrome driver with optimal settings"""
        options = ChromeOptions()
        
        if self.headless:
            options.add_argument('--headless')
        
        # Performance and stability options
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument('--window-size=1920,1080')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # User agent to appear more like a regular browser
        options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
        
        return webdriver.Chrome(options=options)

    def _setup_firefox(self):
        """Setup Firefox driver"""
        options = FirefoxOptions()
        
        if self.headless:
            options.add_argument('--headless')
        
        options.add_argument('--width=1920')
        options.add_argument('--height=1080')
        
        return webdriver.Firefox(options=options)

    def load_all_universities(self, max_wait_time=300):
        """Load the page and scroll/click to load all university entries"""
        logging.info(f"Loading US News rankings page: {self.base_url}")
        
        self.driver.get(self.base_url)
        
        # Handle cookies and initial page load
        time.sleep(5)
        logging.info("Handling cookie consent...")
        self._handle_cookie_banner()
        time.sleep(3)
        
        # Wait for content to load
        self._wait_for_content()
        
        # Scroll and load more content
        loaded_count = self._scroll_and_load_content(max_wait_time)
        
        logging.info(f"Finished loading. Total entries visible: {loaded_count}")
        return loaded_count

    def _handle_cookie_banner(self):
        """Handle cookie consent banner if present"""
        try:
            time.sleep(3)
            
            # Try various methods to close modals/banners
            close_methods = [
                ("button[aria-label='Close']", "aria-label close"),
                ("button[title='Close']", "title close"),
                (".close-button", "close button class"),
                ("button[id*='accept']", "accept id"),
                ("button[class*='accept']", "accept class"),
                ("button[class*='cookie']", "cookie class")
            ]
            
            for selector, method_name in close_methods:
                try:
                    if self._try_close_modal(selector, method_name):
                        return
                except Exception:
                    continue
            
            # Try text-based button search
            buttons = self.driver.find_elements(By.TAG_NAME, "button")
            for button in buttons:
                if any(text in button.text.lower() for text in ['confirm', 'choice', 'accept', 'continue']):
                    if button.is_displayed():
                        self.driver.execute_script("arguments[0].click();", button)
                        logging.info(f"Closed modal using button text: {button.text}")
                        time.sleep(2)
                        return
            
            # Last resort: ESC key
            from selenium.webdriver.common.keys import Keys
            self.driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.ESCAPE)
            logging.info("Attempted to dismiss modal with ESC key")
            time.sleep(2)
                    
        except Exception as e:
            logging.debug(f"Cookie handling failed: {e}")

    def _try_close_modal(self, selector, method_name):
        """Try to close modal with given selector"""
        try:
            element = self.driver.find_element(By.CSS_SELECTOR, selector)
            if element.is_displayed():
                self.driver.execute_script("arguments[0].click();", element)
                logging.info(f"Closed modal using {method_name}")
                time.sleep(2)
                return True
        except NoSuchElementException:
            pass
        return False

    def _wait_for_content(self):
        """Wait for initial content to load"""
        content_selectors = [
            "li[class*='item-list']",
            "[data-testid='ranking-item']",
            ".RankingItem",
            ".ranking-item",
            "a[href*='/education/best-global-universities/']",
            "h1, h2, h3"
        ]
        
        for selector in content_selectors:
            try:
                WebDriverWait(self.driver, 15).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, selector))
                )
                logging.info(f"Content loaded with selector: {selector}")
                return
            except TimeoutException:
                continue
        
        logging.warning("No specific content selectors found - proceeding anyway")

    def _scroll_and_load_content(self, max_wait_time):
        """Scroll down and click 'Load More' buttons to load all content"""
        start_time = time.time()
        last_count = 0
        same_count_iterations = 0
        
        while time.time() - start_time < max_wait_time:
            # Scroll to bottom
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)
            
            # Try to click "Load More" button
            load_more_clicked = self._click_load_more_button()
            
            if load_more_clicked:
                time.sleep(3)
            
            # Count current entries
            current_count = self._count_university_entries()
            logging.info(f"Currently loaded universities: {current_count}")
            
            # Check stopping conditions
            if current_count >= self.max_entries:
                logging.info(f"Reached target of {self.max_entries} entries")
                break
                
            if current_count == last_count:
                same_count_iterations += 1
                if same_count_iterations >= 5:
                    logging.info("No more content loading - stopping")
                    break
            else:
                same_count_iterations = 0
                
            last_count = current_count
            time.sleep(2)
        
        return self._count_university_entries()

    def _click_load_more_button(self):
        """Try to find and click the 'Load More' button"""
        # Text-based search for load more buttons
        try:
            buttons = self.driver.find_elements(By.TAG_NAME, "button")
            for button in buttons:
                button_text = button.text.lower()
                if any(text in button_text for text in ["load more", "show more", "view more"]):
                    if button.is_displayed() and button.is_enabled():
                        self.driver.execute_script("arguments[0].click();", button)
                        logging.info(f"Clicked 'Load More' button: {button.text}")
                        return True
        except Exception:
            pass
        
        return False

    def _count_university_entries(self):
        """Count the number of university entries currently visible"""
        selectors = [
            "li[class*='item-list'][class*='ListItemStyled']",
            "[data-testid='ranking-item']",
            "[data-testid*='university']",
            ".RankingItem",
            ".ranking-item",
            "a[href*='/education/best-global-universities/']"
        ]
        
        max_count = 0
        for selector in selectors:
            try:
                elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
                count = len([el for el in elements if el.is_displayed()])
                max_count = max(max_count, count)
                if self.debug and count > 0:
                    logging.debug(f"Selector '{selector}' found {count} elements")
            except Exception:
                continue
        
        return max_count

    def extract_university_data(self):
        """Extract university data and clean it to match desired format"""
        logging.info("Starting data extraction from page")
        self.universities = []
        
        # Try different extraction strategies
        strategies = [
            self._extract_via_usnews_list_structure,
            self._extract_via_ranking_items,
            self._extract_via_university_links
        ]

        for strategy in strategies:
            try:
                extracted_data = strategy()
                logging.info(f"{strategy.__name__} extracted {len(extracted_data) if extracted_data else 0} entries")

                if extracted_data and len(extracted_data) > len(self.universities):
                    self.universities = extracted_data
                    if len(self.universities) >= self.max_entries:
                        logging.info(
                            f"Using {strategy.__name__} with {len(self.universities)} entries (reached desired amount)"
                        )
                        break
                    else:
                        logging.info(
                            f"{strategy.__name__} provided partial results - continuing with other strategies"
                        )
            except Exception as e:
                logging.error(f"Strategy {strategy.__name__} failed: {e}")
                continue
        
        if not self.universities:
            logging.error("All extraction strategies failed")
            return []
        
        # Clean and standardize the data
        self.universities = self._clean_and_standardize_data(self.universities)
        
        return self.universities

    def _extract_via_usnews_list_structure(self):
        """Extract based on the actual US News HTML structure"""
        universities = []
        
        # Look for elements that represent ranking items
        selectors = [
            "li[class*='item-list']",
            "li[class*='ListItemStyled']",
            "[data-testid='ranking-item']",
            ".RankingItem",
            ".ranking-item",
            "div[class*='ranking-item']"
        ]

        list_items = []
        for selector in selectors:
            elements = self.driver.find_elements(By.CSS_SELECTOR, selector)
            list_items.extend(elements)

        # Deduplicate elements
        list_items = list(dict.fromkeys(list_items))

        logging.info(f"Found {len(list_items)} potential ranking items")
        
        for i, item in enumerate(list_items):
            try:
                university_data = self._parse_usnews_list_item(item, i + 1)
                if university_data:
                    universities.append(university_data)
                    if self.debug:
                        logging.debug(f"Extracted: {university_data}")
            except Exception as e:
                logging.debug(f"Failed to parse list item {i}: {e}")
                continue
        
        return universities

    def _parse_usnews_list_item(self, item, fallback_rank):
        """Parse a single US News list item and clean the data"""
        try:
            item_text = item.text.strip()
            if not item_text:
                return None
            
            # Extract rank - look for #number pattern
            rank = fallback_rank
            rank_match = re.search(r'#(\d+)', item_text)
            if rank_match:
                rank = int(rank_match.group(1))
            
            # Find university name from links
            name = "Unknown University"
            university_links = item.find_elements(By.CSS_SELECTOR, "a[href*='/education/best-global-universities/']")
            
            for link in university_links:
                link_text = link.text.strip()
                if (link_text and 
                    len(link_text) > 3 and 
                    not link_text.lower() in ['read more', 'view more', 'details'] and
                    not re.match(r'^\d+$', link_text)):
                    name = link_text
                    break
            
            # Extract and clean country/location
            country = self._extract_and_clean_country(item_text, name)
            
            return {
                'Rank': rank,
                'University': name,
                'Country': country,
                'Score': 'N/A',
                'Enrollment': 'N/A'
            }
            
        except Exception as e:
            logging.debug(f"Failed to parse US News list item: {e}")
            return None

    def _extract_and_clean_country(self, item_text, university_name):
        """Extract and clean country information from item text"""
        country = 'N/A'
        
        # Split text into lines for analysis
        lines = [line.strip() for line in item_text.split('\n') if line.strip()]
        
        # Look for location patterns in the text
        for i, line in enumerate(lines):
            line_lower = line.lower()
            
            # Skip lines that contain the university name or are obviously not locations
            if (university_name.lower() in line_lower or 
                line.startswith('#') or 
                'score' in line_lower or 
                'enrollment' in line_lower or
                'read more' in line_lower):
                continue
            
            # Check if this line might be a location
            if self._is_likely_location(line):
                # Try to map to standard country name
                mapped_country = self._map_location_to_country(line)
                if mapped_country != 'N/A':
                    country = mapped_country
                    break
                
                # If no mapping, use the line as-is but clean it
                cleaned_line = self._clean_location_text(line)
                if len(cleaned_line) > 2:
                    country = cleaned_line
                    break
        
        return country

    def _is_likely_location(self, text):
        """Check if text is likely a location/country"""
        text_lower = text.lower().strip()
        
        # Skip obviously non-location text
        skip_patterns = [
            r'^\d+$',  # Just numbers
            r'global score',
            r'enrollment',
            r'founded',
            r'read more',
            r'^#\d+',
            r'best global',
            r'universities'
        ]
        
        for pattern in skip_patterns:
            if re.search(pattern, text_lower):
                return False
        
        # Check for common location indicators
        location_indicators = [
            r'\b(u\.s\.)\b',
            r'\b(u\.k\.)\b',
            r'\b(united states|united kingdom|canada|australia|germany|france|china|japan|india|brazil|italy|spain|netherlands|sweden|switzerland|belgium|austria|denmark|norway|finland|singapore|hong kong|south korea|taiwan|israel|mexico)\b',
            r'\b(cambridge|oxford|london|paris|tokyo|beijing|sydney|toronto|munich|zurich|stockholm|amsterdam|copenhagen|vienna|brussels|madrid|barcelona|milan|rome)\b'
        ]
        
        for pattern in location_indicators:
            if re.search(pattern, text_lower):
                return True
        
        # If it's a short, capitalized phrase, it might be a location
        if (len(text.split()) <= 3 and 
            text[0].isupper() and 
            not any(char.isdigit() for char in text)):
            return True
        
        return False

    def _map_location_to_country(self, location_text):
        """Map location text to standardized country name"""
        location_lower = location_text.lower().strip()
        
        # Remove common suffixes/prefixes
        location_lower = re.sub(r'\s*\(.*?\)\s*', '', location_lower)  # Remove parentheses
        location_lower = re.sub(r'\s*-.*$', '', location_lower)  # Remove dash and everything after
        location_lower = location_lower.strip()
        
        # Direct mapping
        if location_lower in self.country_mapping:
            return self.country_mapping[location_lower]
        
        # Partial matching for known countries
        country_patterns = {
            'united states': ['u.s.', 'usa', 'america', 'states'],
            'United Kingdom': ['u.k.', 'uk', 'britain', 'england', 'scotland', 'wales'],
            'China': ['prc', 'mainland china'],
            'South Korea': ['korea', 'republic of korea'],
            'Taiwan': ['republic of china', 'roc'],
            'Hong Kong': ['hk', 'hong kong sar']
        }
        
        for standard_country, patterns in country_patterns.items():
            for pattern in patterns:
                if pattern in location_lower:
                    return standard_country
        
        # Check if the location contains a known country name
        for mapped_country in self.country_mapping.values():
            if mapped_country.lower() in location_lower:
                return mapped_country
        
        return 'N/A'

    def _clean_location_text(self, text):
        """Clean location text to extract just the essential part"""
        # Remove extra whitespace and common prefixes/suffixes
        cleaned = text.strip()
        cleaned = re.sub(r'\s*\(.*?\)\s*', '', cleaned)  # Remove parentheses content
        cleaned = re.sub(r'\s*-.*$', '', cleaned)  # Remove dash and everything after
        cleaned = re.sub(r'^\s*[^A-Za-z]*', '', cleaned)  # Remove leading non-letters
        cleaned = cleaned.strip()
        
        # Capitalize properly
        if len(cleaned) > 1:
            cleaned = ' '.join(word.capitalize() for word in cleaned.split())
        
        return cleaned

    def _extract_via_ranking_items(self):
        """Fallback strategy: Extract via ranking item elements"""
        universities = []
        
        item_selectors = [
            "[data-testid='ranking-item']",
            ".RankingItem",
            ".ranking-item",
            "[class*='ranking'][class*='item']"
        ]
        
        for selector in item_selectors:
            items = self.driver.find_elements(By.CSS_SELECTOR, selector)
            if len(items) > 10:
                logging.info(f"Using selector: {selector} (found {len(items)} items)")
                
                for i, item in enumerate(items):
                    try:
                        university_data = self._parse_ranking_item_clean(item, i + 1)
                        if university_data:
                            universities.append(university_data)
                    except Exception as e:
                        logging.debug(f"Failed to parse item {i}: {e}")
                        continue
                
                break
        
        return universities

    def _parse_ranking_item_clean(self, item, fallback_rank):
        """Parse ranking item with clean output format"""
        try:
            item_text = item.text
            
            # Extract rank
            rank = fallback_rank
            rank_match = re.search(r'#(\d+)', item_text)
            if rank_match:
                rank = int(rank_match.group(1))
            
            # Extract university name
            name = "Unknown University"
            name_selectors = ["h3 a", "h2 a", "h1 a", "a[href*='/education/best-global-universities/']"]
            
            for selector in name_selectors:
                name_elements = item.find_elements(By.CSS_SELECTOR, selector)
                for name_elem in name_elements:
                    name_text = name_elem.text.strip()
                    if (name_text and len(name_text) > 3 and 
                        not name_text.lower() in ['read more', 'view more', 'details']):
                        name = name_text
                        break
                if name != "Unknown University":
                    break
            
            # Clean country extraction
            country = self._extract_and_clean_country(item_text, name)
            
            return {
                'Rank': rank,
                'University': name,
                'Country': country,
                'Score': 'N/A',
                'Enrollment': 'N/A'
            }
            
        except Exception as e:
            logging.debug(f"Failed to parse ranking item: {e}")
            return None

    def _extract_via_university_links(self):
        """Fallback strategy: Extract via university links"""
        universities = []
        
        links = self.driver.find_elements(By.CSS_SELECTOR, "a[href*='/education/best-global-universities/']")
        
        for i, link in enumerate(links):
            try:
                name = link.text.strip()
                if (not name or len(name) < 3 or 
                    name.lower() in ['read more', 'view more', 'details']):
                    continue
                
                # Try to find parent container
                parent = None
                try:
                    parent = link.find_element(By.XPATH, "./ancestor::li[contains(@class, 'item-list')]")
                except:
                    try:
                        parent = link.find_element(By.XPATH, "./ancestor::*[contains(@class, 'item') or contains(@class, 'ranking')]")
                    except:
                        continue
                
                if not parent:
                    continue
                
                parent_text = parent.text
                
                # Extract rank
                rank = i + 1
                rank_match = re.search(r'#(\d+)', parent_text)
                if rank_match:
                    rank = int(rank_match.group(1))
                
                # Clean country extraction
                country = self._extract_and_clean_country(parent_text, name)
                
                universities.append({
                    'Rank': rank,
                    'University': name,
                    'Country': country,
                    'Score': 'N/A',
                    'Enrollment': 'N/A'
                })
                
            except Exception as e:
                logging.debug(f"Failed to parse link {i}: {e}")
                continue
        
        return universities

    def _clean_and_standardize_data(self, universities):
        """Final cleaning and standardization of extracted data"""
        cleaned = []
        seen_names = set()
        
        for uni in universities:
            # Clean university name
            name = uni['University'].strip()
            
            # Skip invalid entries
            if (not name or len(name) < 3 or 
                name.lower() in ['read more', 'view more', 'details', 'unknown university'] or
                name in seen_names):
                continue
            
            seen_names.add(name)
            
            # Validate rank
            try:
                rank = int(uni['Rank'])
                if rank <= 0 or rank > 2000:
                    continue
            except (ValueError, TypeError):
                continue
            
            # Standardize country field
            country = uni.get('Country', 'N/A').strip() or 'N/A'
            if country == 'N/A' or len(country) < 2:
                country = 'N/A'
            
            cleaned.append({
                'Rank': rank,
                'University': name,
                'Country': country,
                'Score': 'N/A',
                'Enrollment': 'N/A'
            })
        
        # Sort by rank and remove duplicate ranks
        cleaned.sort(key=lambda x: x['Rank'])
        
        # Remove duplicate ranks (keep first occurrence)
        seen_ranks = set()
        final_cleaned = []
        for uni in cleaned:
            if uni['Rank'] not in seen_ranks:
                seen_ranks.add(uni['Rank'])
                final_cleaned.append(uni)
        
        return final_cleaned

    def save_to_csv(self, output_file="../frontend/public/data/usnews_rankings.csv"):
        """Save cleaned data to CSV file"""
        if not self.universities:
            logging.error("No university data to save")
            return False
        
        df = pd.DataFrame(self.universities)
        df.to_csv(output_file, index=False)
        
        logging.info(f"Saved {len(self.universities)} universities to {output_file}")
        
        # Print summary
        print(f"\n=== EXTRACTION SUMMARY ===")
        print(f"Total universities extracted: {len(self.universities)}")
        print(f"Rank range: {df['Rank'].min()} - {df['Rank'].max()}")
        print(f"Countries represented: {df['Country'].nunique()}")
        print(f"Universities with identified countries: {len(df[df['Country'] != 'N/A'])}")
        print(f"Output file: {output_file}")
        
        # Show first few entries
        print(f"\nFirst 10 entries:")
        print(df.head(10).to_string(index=False))
        
        return True

    def close(self):
        """Close the browser driver"""
        if self.driver:
            self.driver.quit()
            logging.info("Browser driver closed")

    def extract_rankings(self, output_csv="usnews_rankings_clean.csv", max_wait_time=300):
        """Complete workflow: setup, load content, extract data, save clean CSV"""
        try:
            self.setup_driver()
            loaded_count = self.load_all_universities(max_wait_time)
            
            if loaded_count == 0:
                logging.error("No university entries found")
                return False
            
            universities = self.extract_university_data()
            
            if not universities:
                logging.error("Failed to extract university data")
                return False
            
            success = self.save_to_csv(output_csv)
            return success
            
        except Exception as e:
            logging.error(f"Extraction failed: {e}")
            return False
        finally:
            self.close()

def main():
    parser = argparse.ArgumentParser(description='Extract US News Global University Rankings directly to CSV')
    parser.add_argument('-o', '--output', default='usnews_rankings.csv', help='Output CSV file')
    parser.add_argument('-b', '--browser', choices=['chrome', 'firefox'], default='chrome', help='Browser to use')
    parser.add_argument('--no-headless', action='store_true', help='Run browser in visible mode')
    parser.add_argument('-n', '--max-entries', type=int, default=500, help='Maximum entries to extract')
    parser.add_argument('-t', '--timeout', type=int, default=300, help='Maximum wait time in seconds')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    
    args = parser.parse_args()
    
    if not SELENIUM_AVAILABLE:
        print("Error: Selenium is required. Install with: pip install selenium")
        print("You'll also need the appropriate browser driver:")
        print("- Chrome: Download chromedriver from https://chromedriver.chromium.org/")
        print("- Firefox: Download geckodriver from https://github.com/mozilla/geckodriver/releases")
        sys.exit(1)
    
    # Set debug logging if requested
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    extractor = USNewsPolishedExtractor(
        browser=args.browser,
        headless=not args.no_headless,
        max_entries=args.max_entries,
        debug=args.debug
    )
    
    print(f"Starting direct extraction of US News Rankings...")
    print(f"Browser: {args.browser}")
    print(f"Headless: {not args.no_headless}")
    print(f"Max entries: {args.max_entries}")
    print(f"Output: {args.output}")
    
    success = extractor.extract_rankings(args.output, args.timeout)
    
    if success:
        print(f"\n✅ Successfully extracted rankings to: {args.output}")
    else:
        print("\n❌ Extraction failed. Check the logs for details.")
        sys.exit(1)

if __name__ == "__main__":
    main()