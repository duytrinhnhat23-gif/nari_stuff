
import os
import socket
import subprocess
import time

from playwright.sync_api import sync_playwright


# ============================================================
# CONFIGURATION
# ============================================================

CHROME_DEBUG_PORT = 9222
FACILITY_NAME = "Azusa Dialysis"

SEARCH_URL = (
    "https://dmmtprod.renvio.com/"
    "EMR/dialysismanager/patients/search"
)

CHROME_PROFILE = os.path.join(
    os.environ.get("LOCALAPPDATA", os.path.expanduser("~")),
    "RenvioChromeProfile"
)


# ============================================================
# START CHROME
# ============================================================

def is_debug_port_open():
    try:
        with socket.create_connection(
            ("127.0.0.1", CHROME_DEBUG_PORT),
            timeout=0.5
        ):
            return True
    except OSError:
        return False


def find_chrome():
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.join(
            os.environ.get("LOCALAPPDATA", ""),
            "Google", "Chrome", "Application", "chrome.exe"
        )
    ]

    for path in candidates:
        if os.path.isfile(path):
            return path

    raise RuntimeError("Google Chrome was not found.")


def ensure_debug_chrome():
    if is_debug_port_open():
        print("Chrome debugging already running.")
        return

    print("Starting Chrome...")

    os.makedirs(CHROME_PROFILE, exist_ok=True)

    subprocess.Popen(
        [
            find_chrome(),
            f"--remote-debugging-port={CHROME_DEBUG_PORT}",
            f"--user-data-dir={CHROME_PROFILE}",
            "--no-first-run",
            "--no-default-browser-check",
            "https://dmmtprod.renvio.com/"
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    for _ in range(100):
        if is_debug_port_open():
            print("Chrome ready.")
            return

        time.sleep(0.1)

    raise RuntimeError(
        "Chrome remote debugging did not start."
    )


# ============================================================
# FIND PATIENT SEARCH PAGE
# ============================================================

def find_search_page(browser):
    # Prefer a page containing the actual search form
    for context in browser.contexts:
        for page in reversed(context.pages):
            try:
                if page.is_closed():
                    continue

                if (
                    page.locator("#lastName").count() > 0
                    and page.locator("#firstName").count() > 0
                ):
                    return page
            except Exception:
                pass

    # Otherwise find the existing Patient Search URL
    for context in browser.contexts:
        for page in reversed(context.pages):
            if "/patients/search" in page.url.lower():
                return page

    return None


# ============================================================
# SELECT AZUSA DIALYSIS
# ============================================================

def select_facility(page, facility_name):
    facility = page.locator(
        "#FacilityIdList ng-multiselect-dropdown"
    )

    facility.wait_for(state="visible", timeout=15000)

    # Open dropdown
    facility.locator(".dropdown-btn").click()

    # Identify currently selected facilities
    selected_items = facility.locator(
        ".selected-item-container .selected-item"
    )

    selected_names = selected_items.locator(
        "span:first-child"
    ).all_text_contents()

    selected_names = [
        name.strip() for name in selected_names
    ]

    # Remove other facilities if any are selected
    for name in selected_names:
        if name.casefold() != facility_name.casefold():
            item = selected_items.filter(has_text=name)
            item.locator("a").click()
            print(f"Removed facility: {name}")

    # Check if Azusa Dialysis is already selected
    selected_azusa = selected_items.filter(
        has_text=facility_name
    )

    if selected_azusa.count() > 0:
        print(f"Facility already selected: {facility_name}")
    else:
        # Reopen dropdown if necessary
        dropdown_list = facility.locator(".dropdown-list")

        if not dropdown_list.is_visible():
            facility.locator(".dropdown-btn").click()

        # Exact option from your HTML:
        # <input aria-label="Azusa Dialysis">
        option = facility.locator(
            'li.multiselect-item-checkbox'
        ).filter(
            has=page.locator(
                f'input[aria-label="{facility_name}"]'
            )
        )

        option.wait_for(state="visible", timeout=10000)
        option.click()

        print(f"Selected facility: {facility_name}")

    # Verify the final selection
    final_names = [
        name.strip()
        for name in facility.locator(
            ".selected-item-container .selected-item span:first-child"
        ).all_text_contents()
    ]

    if final_names != [facility_name]:
        raise RuntimeError(
            f"Facility selection verification failed: {final_names}"
        )

    print("Facility selection verified.")


# ============================================================
# MAIN
# ============================================================

def main():
    ensure_debug_chrome()

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(
            f"http://127.0.0.1:{CHROME_DEBUG_PORT}"
        )

        print("Connected to Chrome.")

        page = find_search_page(browser)

        if page is None:
            raise RuntimeError(
                "Patient Search page not found. "
                "Navigate to Patient Search in the Chrome "
                "window opened by this script, then rerun."
            )

        page.bring_to_front()
        print("Patient Search page found.")

        # Wait for the search form
        page.locator("#lastName").wait_for(
            state="visible",
            timeout=30000
        )

        # Clear patient names
        page.locator("#lastName").fill("")
        page.locator("#firstName").fill("")

        print("Cleared First Name and Last Name.")

        # Select Azusa Dialysis only
        select_facility(page, FACILITY_NAME)

        # Click Search
        page.get_by_role(
            "button",
            name="Search",
            exact=True
        ).click(timeout=10000)

        print("Clicked Search.")
        print(f"Search submitted for {FACILITY_NAME}.")
        print("Current URL:", page.url)


if __name__ == "__main__":
    main()
