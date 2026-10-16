from playwright.sync_api import sync_playwright

from datetime import datetime

import os

import re

import threading

import subprocess

import socket

import time

import tkinter as tk

from tkinter import ttk, messagebox, filedialog


# ============================================================

# CONFIG

# ============================================================


# Subject ID, First Name, Last Name. IDs are strings to preserve leading zeros.
PATIENTS = sorted([
    ('E7819018', 'Ralph', 'Velasco'),
    ('E7819021', 'Susan', 'Timmons'),
    ('024-017', 'Robert', 'Strober'),
    ('E7819024', 'Brandon', 'Smith'),
    ('E7819019', 'Marcus', 'Shields'),
    ('112008', 'Jeremiah', 'Santa Ana'),
    ('E7819012', 'Vincent', 'Sandoval'),
    ('024-007', 'Felipe', 'Sanchez Santos'),
    ('E7819001', 'Hector', 'Salazar'),
    ('E7819017', 'Ina', 'Ruan'),
    ('E7819008', 'Marcy', 'Rodriguez'),
    ('024-001', 'Esther', 'Rodriguez'),
    ('024-013', 'Antonio', 'Rios Lopez'),
    ('024-003', 'Jose', 'Quezada'),
    ('024-005', 'Veronica', 'Perez Cortes'),
    ('E7819007', 'Anita', 'Parra'),
    ('E7819016', 'Robert', 'Parenti'),
    ('E7819003', 'Rita', 'Paramo'),
    ('E7819005', 'Nora', 'Olvera Martinez'),
    ('E7819022', 'Brian', 'Olivas'),
    ('024-014', 'Hector', 'Mercado'),
    ('112005', 'Antonio', 'Mendoza Tadeo'),
    ('E7819025', 'Fidel', 'Mendez'),
    ('E7819011', 'Marie', 'Martinez'),
    ('112009', 'Nancy', 'Marin Ramirez'),
    ('E7819010', 'Dennis', 'Mallari'),
    ('024-011', 'Cynthia', 'Lozano'),
    ('112002', 'Jose', 'Lopez'),
    ('024-012', 'Elodio', 'Lomeli Vazquez'),
    ('024-015', 'Jose L.', 'Lopez'),
    ('E7819006', 'Rosa', 'Huerta Lopez'),
    ('112004', 'Angelica', 'Hernandez'),
    ('112011', 'Mariano', 'Guerrero'),
    ('E7819013', 'Jose', 'Guerra'),
    ('112001', 'Sonia', 'Garcia'),
    ('E7819004', 'Janet', 'Garcia'),
    ('E7819004*', 'Janet', 'Garcia'),
    ('112014', 'Homero', 'Garay'),
    ('024-006', 'Alonso', 'Gamez'),
    ('E7819002', 'Ruth', 'Gamboa'),
    ('E7819014', 'Tomas', 'Galdamez'),
    ('112003', 'Victor', 'Flores'),
    ('024-016', 'Victor', 'Flores'),
    ('024-010', 'Miguel', 'Fernandez'),
    ('112016', 'Maria', 'Eusebio de Burbano'),
    ('E7819015', 'Francisca', 'Esparza'),
    ('024-009', 'Sergio', 'Escalante'),
    ('112006', 'John', 'Duran'),
    ('E7819023', 'Karen', 'Diaz de Leon'),
    ('112015', 'Pedro', 'Cruz'),
    ('E7819020', 'Lloyd Allen', 'Cope'),
    ('E7819009', 'Fidel', 'Chavez Duran'),
    ('024-004', 'Emma', 'Bustamante'),
    ('112012', 'Cathy', 'Bermudez'),
    ('024-002', 'Negemias', 'Basical'),
    ('112007', 'Ezbeydi', 'Avalos'),
    ('112013', 'Juan', 'Arteaga Gaytan'),
    ('024-008', 'Roman', 'Aguilar Romero'),
    ('112010', 'Juan', 'Aguilar Martinez'),
    ('025-015', 'Edmundo', 'Zammarripa'),
    ('025-007', 'Yolanda', 'Weniger'),
    ('025-005', 'Elias', 'Vrooman'),
    ('113008', 'Francisca', 'Soto'),
    ('025-010', 'Josefina', 'Sheather'),
    ('025-008', 'Jorge', 'Sanchez'),
    ('025-001', 'Alexander', 'Sanchez'),
    ('025-016', 'Mojgan', 'Saeedi-Akbarzade'),
    ('113013', 'Phillip', 'Perez'),
    ('025-020', 'Elvira', 'Munoz'),
    ('025-003', 'Dolores', 'Mendoza'),
    ('113010', 'Marie', 'Martinez'),
    ('025-009', 'Nephtali', 'Lopez'),
    ('025-019', 'Celia', 'Lopez'),
    ('025-017', 'Michael', 'Kasicki'),
    ('025-018', 'Paul', 'Hyde'),
    ('113009', 'Roxanne', 'Huerta'),
    ('025-012', 'Roxanne', 'Huerta'),
    ('113011', 'Gregory', 'Hollingquest'),
    ('113002', 'Celerina', 'Hernandez Lopez'),
    ('113012', 'Angela', 'Gomez'),
    ('113004', 'Alicia', 'Garcia'),
    ('025-011', 'Alicia', 'Garcia'),
    ('113006', 'Hilda Beatriz', 'Galvez Chavez'),
    ('025-014', 'Nicholas', 'Galluppi'),
    ('113003', 'Yvonne', 'Galassi'),
    ('025-006', 'John', 'Estrella'),
    ('025-013', 'David', 'Enlow'),
    ('113005', 'Phillip', 'De La Pena'),
    ('113014', 'Erlinda', 'De La Cruz'),
    ('025-004', 'Francisco', 'Chavarin'),
    ('113001', 'Glen', 'Bollinger'),
    ('025-002', 'Brenda', 'Bernal'),
    ('113007', 'Francisco', 'Avina')
], key=lambda item: (item[0].casefold(), item[1].casefold()))

LAST_NAME = "meyer"

FIRST_NAME = "robert"


DEFAULT_SAVE_FOLDER = (

    r"C:\Users\duytr\Desktop"

    r"\Rave_EDC_PEAK\renvio\downloads"

)


SAVE_FOLDER = DEFAULT_SAVE_FOLDER

FILE_PREFIX = ""


# Global pause control. When cleared, automation waits here until resumed.

PAUSE_EVENT = threading.Event()

PAUSE_EVENT.set()


def wait_if_paused():
    """Block automation while the Pause button is active."""

    while not PAUSE_EVENT.is_set():

        time.sleep(0.1)


CUSTOM_FILENAMES = {

    "HD_Flowsheets": "HD Flowsheets",

    "Dialysis_Visit_Note": "Physician Notes",

    "Hemodialysis_Order": "Dialysis Orders",

    "Nursing_Progress_Notes": "Nursing Progress Notes",

    "General_Continuation_Notes": "General Notes",

    "No_Show_Treatment": "No Show",

}


START_URL = (

    "https://dmmtprod.renvio.com/EMR/dialysismanager/w4/a?"

    "p=L1dlYkZvcm1zL0RpYWx5c2lzL0hEVHJlYXRtZW50Rmxvd3NoZWV0LmFzcHgm"

    "TWVudU5hbWU9SEQgRmxvd3NoZWV0cyZNZW51SUQ9MjEmXz0xNzg4MTQwNTk2NDIz"

)


PAGE_URLS = {

    "HD_Flowsheets": (

        "https://dmmtprod.renvio.com/"

        "EMRHeritage/WebForms/Dialysis/"

        "HDTreatmentFlowsheet.aspx"

    ),

    "Dialysis_Visit_Note": (

        "https://dmmtprod.renvio.com/"

        "EMRHeritage/WebForms/Assessment/"

        "DialysisVisitNote.aspx?R=R"

    ),

    "Hemodialysis_Order": (

        "https://dmmtprod.renvio.com/"

        "EMRHeritage/WebForms/Dialysis/"

        "HemodialysisOrder.aspx"

    ),

}


# ============================================================

# HELPERS

# ============================================================


MONTHS = [

    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",

    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"

]


def parse_split_date(day_value, month_value, year_value):
    """

    Parse UI date fields entered as:

    DD + MMM + YYYY

    Example: 01 + SEP + 2026

    """

    day_text = (day_value or "").strip()

    month_text = (month_value or "").strip().upper()

    year_text = (year_value or "").strip()

    if not day_text.isdigit():

        raise ValueError("Day must be a number from 01 to 31.")

    if month_text not in MONTHS:

        raise ValueError("Select a valid month.")

    if not year_text.isdigit() or len(year_text) != 4:

        raise ValueError("Year must contain 4 digits.")

    day = int(day_text)

    month = MONTHS.index(month_text) + 1

    year = int(year_text)

    try:

        return datetime(year, month, day).date()

    except ValueError as e:

        raise ValueError("Enter a valid calendar date.") from e


def sanitize_filename_part(value):

    value = (value or "").strip()

    if not value:

        value = "Document"

    return re.sub(r'[<>:"/\\\\|?*]', "_", value)


def build_filename(name, from_date, to_date, last_name, first_name):

    custom_name = sanitize_filename_part(

        CUSTOM_FILENAMES.get(name, name)

    )

    date_range = (

        f"{from_date:%Y-%m-%d}_to_{to_date:%Y-%m-%d}"

    )

    if FILE_PREFIX.strip():

        filename = (

            f"{sanitize_filename_part(FILE_PREFIX)} "

            f"{custom_name} "

            f"{date_range}"

        )

    else:

        filename = (

            f"{custom_name} "

            f"{date_range}"

        )

    return filename + ".pdf"


def find_search_page(context):
    """

    Find the Patient Search tab using several signals instead of relying

    only on one exact URL. Renvio may keep the Search Patient UI loaded

    while the URL is a wrapper / w4 route.

    """

    pages = list(context.pages)

    # Strongest signal: the actual patient-search form fields exist.

    for page in reversed(pages):

        try:

            if page.is_closed():

                continue

            if (

                page.locator("#lastName").count() > 0

                and page.locator("#firstName").count() > 0

            ):

                print("✅ Patient Search tab found by form fields:", page.url)

                return page

        except Exception:

            pass

    # Next try known search URL patterns.

    for page in reversed(pages):

        try:

            url = (page.url or "").lower()

            if (

                "/patients/search" in url

                or "/patient/search" in url

                or "searchpatient" in url

            ):

                print("✅ Patient Search tab found by URL:", page.url)

                return page

        except Exception:

            pass

    # Finally try the visible page title / text.

    for page in reversed(pages):

        try:

            if page.is_closed():

                continue

            title = (page.title() or "").lower()

            if "search patient" in title or "patient search" in title:

                print("✅ Patient Search tab found by title:", page.url)

                return page

            body_text = page.locator("body").inner_text(timeout=1500).lower()

            if (

                "search patient" in body_text

                and "last name" in body_text

                and "first name" in body_text

            ):

                print("✅ Patient Search tab found by visible text:", page.url)

                return page

        except Exception:

            pass

    print("⚠️ Open tabs when Patient Search could not be identified:")

    for index, page in enumerate(pages, start=1):

        try:

            print(f"  {index}. {page.title()} | {page.url}")

        except Exception:

            pass

    return None


def search_patient(page, last_name, first_name):

    wait_if_paused()

    page.bring_to_front()

    page.wait_for_selector("#lastName", timeout=15000)

    page.locator("#lastName").fill(last_name)

    page.locator("#firstName").fill(first_name)

    button = page.get_by_role(

        "button",

        name="Search",

        exact=True

    )

    if not button.count():

        raise Exception("Search button not found")

    button.click()

    page.wait_for_timeout(1000)

    print(

        f"✅ Patient searched: "

        f"{last_name}, {first_name}"

    )


def open_document_page(context, url, name):

    wait_if_paused()

    print(f"\nOpening {name}...")

    page = context.new_page()

    page.goto(

        url,

        wait_until="domcontentloaded",

        timeout=30000

    )

    page.bring_to_front()

    print("✅ Opened:", page.url)

    return page


# ============================================================

# PDF CAPTURE

# ============================================================


def capture_pdf(

    context,

    source_page,

    click_element,

    save_path,

    name

):

    pdf = {"body": None}

    capture_enabled = {"value": False}

    old_pages = set(context.pages)

    def on_response(response):

        if not capture_enabled["value"]:

            return

        try:

            content_type = (

                response.headers

                .get("content-type", "")

                .lower()

            )

            if "application/pdf" not in content_type:

                return

            body = response.body()

            if body.startswith(b"%PDF"):

                pdf["body"] = body

                print(

                    "✅ PDF response captured:",

                    len(body),

                    "bytes"

                )

        except Exception:

            pass

    context.on("response", on_response)

    def intercept(route, request):

        if (

            not capture_enabled["value"]

            or request.method.upper() != "POST"

        ):

            route.continue_()

            return

        try:

            response = route.fetch()

            content_type = (

                response.headers

                .get("content-type", "")

                .lower()

            )

            body = response.body()

            print(

                "POST response:",

                content_type,

                len(body),

                "bytes"

            )

            if (

                "application/pdf" in content_type

                and body.startswith(b"%PDF")

            ):

                pdf["body"] = body

                print(

                    f"🎯 {name} PDF captured from POST"

                )

            route.fulfill(response=response)

        except Exception as e:

            print("POST intercept error:", e)

            try:

                route.continue_()

            except Exception:

                pass

    context.route("**/*", intercept)

    try:

        capture_enabled["value"] = True

        wait_if_paused()

        print(f"🖨️ Printing {name}...")

        click_element.click()

        # HD Flowsheets may take longer when many records are selected.
        # 600 x 100 ms = maximum 60 seconds.
        # Other PDFs remain at maximum 15 seconds.
        max_wait = 600 if name == "HD Flowsheets" else 150

        for _ in range(max_wait):
            if pdf["body"]:
                break

            source_page.wait_for_timeout(100)

    finally:

        capture_enabled["value"] = False

        try:

            context.remove_listener(

                "response",

                on_response

            )

        except Exception:

            pass

        try:

            context.unroute(

                "**/*",

                intercept

            )

        except Exception:

            pass

    new_pages = set(context.pages) - old_pages

    for popup in new_pages:

        try:

            if popup != source_page:

                popup.close()

        except Exception:

            pass

    if not pdf["body"]:

        print(

            f"❌ {name}: PDF was not captured"

        )

        return False

    with open(save_path, "wb") as f:

        f.write(pdf["body"])

    print("✅ SAVED:", save_path)

    return True


def clear_checkboxes(page, selector):

    checkboxes = page.locator(selector)

    for i in range(checkboxes.count()):

        cb = checkboxes.nth(i)

        try:

            if cb.is_checked():

                cb.uncheck()

        except Exception:

            pass


# ============================================================

# HD TREATMENT FLOWSHEET

# ============================================================


def process_hd_flowsheet(

    context,

    page,

    from_date,

    to_date,

    last_name,

    first_name

):

    wait_if_paused()

    print("\n===== HD FLOWSHEETS =====")

    # Give the Hemodialysis Flowsheet page at most 10 seconds to load.

    page.wait_for_selector(

        "#cphForm_gvFlowsheetList",

        timeout=10000

    )

    checkbox_selector = (

        'input[id^="cphForm_gvFlowsheetList_'

        'chkItemChecked_"]'

    )

    clear_checkboxes(

        page,

        checkbox_selector

    )

    rows = page.locator(

        "#cphForm_gvFlowsheetList tr"

    )

    selected = 0

    for i in range(1, rows.count()):

        wait_if_paused()

        row = rows.nth(i)

        cells = row.locator("td")

        if not cells.count():

            continue

        date_text = (

            cells.nth(0)

            .inner_text()

            .strip()

        )

        try:

            date_value = datetime.strptime(

                date_text,

                "%m/%d/%Y"

            ).date()

        except ValueError:

            continue

        if not (

            from_date

            <= date_value

            <= to_date

        ):

            continue

        checkbox = row.locator(

            checkbox_selector

        )

        if not checkbox.count():

            continue

        checkbox.first.check()

        selected += 1

        print("✅", date_text)

    print("Selected:", selected)

    if not selected:

        print("❌ No HD flowsheets found")

        return False

    print_button = page.locator(

        "#cphForm_btnPrintBatch"

    )

    if not print_button.count():

        print("❌ Batch Print not found")

        return False

    save_path = os.path.join(

        SAVE_FOLDER,

        build_filename(

            "HD_Flowsheets",

            from_date,

            to_date,

            last_name,

            first_name

        )

    )

    return capture_pdf(

        context,

        page,

        print_button,

        save_path,

        "HD Flowsheets"

    )


# ============================================================

# DIALYSIS VISIT NOTE

# ============================================================


def process_dialysis_visit_note(

    context,

    page,

    from_date,

    to_date,

    last_name,

    first_name

):

    wait_if_paused()

    print("\n===== DIALYSIS VISIT NOTE =====")

    page.wait_for_selector(

        "#cphForm_gvDialysisVisitNote",

        timeout=15000

    )

    checkbox_selector = (

        'input[id^="cphForm_gvDialysisVisitNote_'

        'chkItemChecked_"]'

    )

    clear_checkboxes(

        page,

        checkbox_selector

    )

    date_links = page.locator(

        'a[id^="cphForm_gvDialysisVisitNote_'

        'lnkDialysis_Date_"]'

    )

    selected = 0

    for i in range(date_links.count()):

        wait_if_paused()

        date_link = date_links.nth(i)

        date_text = (

            date_link

            .inner_text()

            .strip()

        )

        try:

            date_value = datetime.strptime(

                date_text,

                "%m/%d/%Y"

            ).date()

        except ValueError:

            continue

        if not (

            from_date

            <= date_value

            <= to_date

        ):

            continue

        element_id = (

            date_link.get_attribute("id")

            or ""

        )

        match = re.search(

            r"_(\d+)$",

            element_id

        )

        if not match:

            continue

        index = match.group(1)

        checkbox = page.locator(

            "#cphForm_"

            "gvDialysisVisitNote_"

            f"chkItemChecked_{index}"

        )

        if not checkbox.count():

            print(

                "⚠️ Checkbox not found:",

                date_text

            )

            continue

        checkbox.check()

        selected += 1

        print("✅", date_text)

    print("Selected:", selected)

    if not selected:

        print(

            "❌ No Dialysis Visit Notes found"

        )

        return False

    print_button = page.locator(

        "#cphForm_btnPrintBatch"

    )

    if not print_button.count():

        print("❌ Batch Print not found")

        return False

    save_path = os.path.join(

        SAVE_FOLDER,

        build_filename(

            "Dialysis_Visit_Note",

            from_date,

            to_date,

            last_name,

            first_name

        )

    )

    return capture_pdf(

        context,

        page,

        print_button,

        save_path,

        "Dialysis Visit Note"

    )


# ============================================================

# HEMODIALYSIS ORDER

# ============================================================


def process_hemodialysis_order(

    context,

    page,

    from_date,

    to_date,

    last_name,

    first_name

):

    wait_if_paused()

    print("\n===== HEMODIALYSIS ORDER =====")

    page.wait_for_selector(

        "#cphForm_grdOrderList",

        timeout=15000

    )

    checkbox_selector = (

        'input[id^="cphForm_grdOrderList_'

        'chkItemChecked_"]'

    )

    clear_checkboxes(

        page,

        checkbox_selector

    )

    date_links = page.locator(

        'a[id^="cphForm_grdOrderList_'

        'lnkbtnorder_date_"]'

    )

    selected = 0

    for i in range(date_links.count()):

        wait_if_paused()

        date_link = date_links.nth(i)

        date_text = (

            date_link

            .inner_text()

            .strip()

        )

        try:

            date_value = datetime.strptime(

                date_text,

                "%m/%d/%Y"

            ).date()

        except ValueError:

            continue

        if not (

            from_date

            <= date_value

            <= to_date

        ):

            continue

        element_id = (

            date_link.get_attribute("id")

            or ""

        )

        match = re.search(

            r"_(\d+)$",

            element_id

        )

        if not match:

            continue

        index = match.group(1)

        checkbox = page.locator(

            "#cphForm_"

            "grdOrderList_"

            f"chkItemChecked_{index}"

        )

        if not checkbox.count():

            print(

                "⚠️ Checkbox not found:",

                date_text

            )

            continue

        checkbox.check()

        selected += 1

        print("✅", date_text)

    print("Selected:", selected)

    if not selected:

        print(

            "❌ No Hemodialysis Orders found"

        )

        return False

    print_button = page.locator(

        "#cphForm_btnPrintBatch"

    )

    if not print_button.count():

        print("❌ Batch Print not found")

        return False

    save_path = os.path.join(

        SAVE_FOLDER,

        build_filename(

            "Hemodialysis_Order",

            from_date,

            to_date,

            last_name,

            first_name

        )

    )

    return capture_pdf(

        context,

        page,

        print_button,

        save_path,

        "Hemodialysis Order"

    )


def run_document(

    context,

    search_page,

    url,

    name,

    from_date,

    to_date,

    processor,

    last_name,

    first_name

):

    page = None

    try:

        page = open_document_page(

            context,

            url,

            name

        )

        return processor(

            context,

            page,

            from_date,

            to_date,

            last_name,

            first_name

        )

    except Exception as e:

        print(f"❌ {name}:", e)

        return False

    finally:

        if page:

            try:

                if not page.is_closed():

                    page.close()

            except Exception:

                pass

        try:

            search_page.bring_to_front()

        except Exception:

            pass


# ============================================================

# NURSING PROGRESS NOTES

# ============================================================


def process_nursing_progress_notes(

    search_page,

    from_date,

    to_date,

    save_folder,

    last_name,

    first_name

):

    wait_if_paused()

    print()

    print("==========================================")

    print("NURSING EVALUATION - PROGRESS NOTES")

    print("==========================================")

    continuation_url = (

        "https://dmmtprod.renvio.com/"

        "EMR/dialysismanager/assessments/"

        "NursingEvaluations/ContinuationNotes"

    )

    print("Current Search URL:")

    print(search_page.url)

    print()

    print(

        "➡️ Navigating SAME Search Patient tab..."

    )

    search_page.bring_to_front()

    search_page.evaluate(

        """

        url => {

            window.location.href = url;

        }

        """,

        continuation_url

    )

    try:

        search_page.wait_for_url(

            "**/NursingEvaluations/ContinuationNotes*",

            timeout=20000

        )

    except Exception:

        pass

    print("URL:", search_page.url)

    if (

        "login" in search_page.url.lower()

        or "logout" in search_page.url.lower()

    ):

        print("❌ Renvio logged out.")

        return False

    try:

        search_page.wait_for_selector(

            "span.lnkActive",

            timeout=20000

        )

    except Exception:

        print(

            "❌ Progress Notes table did not appear."

        )

        return False

    print("✅ Progress Notes loaded")

    table = search_page.locator(

        "table.table.table-striped"

    )

    if table.count() == 0:

        print(

            "❌ Progress Notes table not found"

        )

        return False

    checkboxes = table.locator(

        'tbody input[type="checkbox"]'

        '[title="Select for batch print"]'

    )

    print(

        "Batch checkboxes found:",

        checkboxes.count()

    )

    for i in range(checkboxes.count()):

        checkbox = checkboxes.nth(i)

        try:

            if checkbox.is_checked():

                checkbox.click()

        except Exception:

            pass

    rows = table.locator("tbody tr")

    selected_dates = []

    print()

    print(

        "Selecting Progress Notes from",

        from_date.strftime("%m/%d/%Y"),

        "to",

        to_date.strftime("%m/%d/%Y")

    )

    for i in range(rows.count()):

        wait_if_paused()

        row = rows.nth(i)

        date_element = row.locator(

            "span.lnkActive"

        )

        if date_element.count() == 0:

            continue

        try:

            date_text = (

                date_element.first

                .inner_text()

                .strip()

            )

        except Exception:

            continue

        try:

            note_date = datetime.strptime(

                date_text,

                "%m/%d/%Y"

            ).date()

        except ValueError:

            continue

        if not (

            from_date

            <= note_date

            <= to_date

        ):

            continue

        checkbox = row.locator(

            'input[type="checkbox"]'

            '[title="Select for batch print"]'

        )

        if checkbox.count() == 0:

            print(

                "⚠️ Batch checkbox missing:",

                date_text

            )

            continue

        try:

            if not checkbox.first.is_checked():

                checkbox.first.click()

            selected_dates.append(date_text)

            print(

                "✅ Selected:",

                date_text

            )

        except Exception as e:

            print(

                "❌ Could not select",

                date_text,

                e

            )

    if not selected_dates:

        print(

            "❌ No Nursing Progress Notes "

            "found in requested date range."

        )

        # Next workflow navigates this same tab directly; no browser Back needed.
        print("⏩ No matching Nursing Progress Notes; continuing immediately...")
        return False

    print(

        "Total selected:",

        len(selected_dates)

    )

    batch_print = search_page.get_by_role(

        "button",

        name="Batch Print",

        exact=True

    )

    if batch_print.count() == 0:

        print(

            "❌ Batch Print button not found"

        )

        return False

    print("✅ Batch Print button found")

    print("🖨️ Clicking Batch Print...")

    batch_print.click()

    try:

        search_page.wait_for_selector(

            "#aDownload",

            state="visible",

            timeout=30000

        )

    except Exception:

        print(

            "❌ PDF modal did not appear"

        )

        return False

    print("✅ PDF modal appeared")

    download_link = search_page.locator(

        "#aDownload"

    )

    href = download_link.get_attribute(

        "href"

    )

    print("PDF Blob URL:", href)

    if (

        not href

        or not href.startswith("blob:")

    ):

        print(

            "❌ Modal exists but Blob PDF "

            "URL was not found."

        )

        return False

    print("✅ Blob PDF ready")

    safe_last = re.sub(

        r'[^A-Za-z0-9_-]',

        '_',

        last_name

    )

    safe_first = re.sub(

        r'[^A-Za-z0-9_-]',

        '_',

        first_name

    )

    download_name = (

        f"{safe_last}_{safe_first}.pdf"

    )

    download_link.evaluate(

        """

        (element, filename) => {

            element.setAttribute(

                "download",

                filename

            );

        }

        """,

        download_name

    )

    os.makedirs(

        save_folder,

        exist_ok=True

    )

    save_name = build_filename(

        "Nursing_Progress_Notes",

        from_date,

        to_date,

        last_name,

        first_name

    )

    save_path = os.path.join(

        save_folder,

        save_name

    )

    print("⬇️ Clicking modal Download...")

    try:

        with search_page.expect_download(

            timeout=30000

        ) as download_info:

            download_link.click()

        download = download_info.value

        print(

            "✅ Browser download detected"

        )

        print(

            "Browser suggested filename:",

            download.suggested_filename

        )

        download.save_as(save_path)

    except Exception as e:

        print("❌ Download failed:", e)

        return False

    if not os.path.exists(save_path):

        print("❌ File was not saved")

        return False

    print(

        "✅ NURSING PROGRESS NOTES SAVED"

    )

    print("File:", save_path)

    close_button = search_page.locator(

        '.modal-content '

        'button[aria-label="Close"]'

    )

    if close_button.count() > 0:

        try:

            close_button.click()

        except Exception:

            pass

    # Skip browser Back; General Notes navigates directly in this same tab.
    print("⏩ Nursing Progress Notes complete; continuing immediately...")
    search_page.bring_to_front()
    return True


# ============================================================

# GENERAL CONTINUATION NOTES

# ============================================================


def process_dialysis_visit_note_same_tab(

    search_page,

    from_date,

    to_date,

    save_folder,

    last_name,

    first_name

):

    wait_if_paused()

    print()

    print("==========================================")

    print("DIALYSIS VISIT NOTE")

    print("==========================================")

    continuation_url = (

        "https://dmmtprod.renvio.com/"

        "EMR/dialysismanager/assessments/"

        "DialysisVisitNote"

    )

    print("Current Search URL:")

    print(search_page.url)

    print()

    print(

        "➡️ Navigating SAME Search Patient tab "

        "to Dialysis Visit Note..."

    )

    search_page.bring_to_front()

    search_page.evaluate(

        """

        url => {

            window.location.href = url;

        }

        """,

        continuation_url

    )

    try:

        search_page.wait_for_url(

            "**/assessments/DialysisVisitNote*",

            timeout=20000

        )

    except Exception:

        pass

    print("URL:", search_page.url)

    if (

        "login" in search_page.url.lower()

        or "logout" in search_page.url.lower()

    ):

        print("❌ Renvio logged out.")

        return False

    try:
        search_page.wait_for_selector(
            'tbody input[type="checkbox"]',
            timeout=30000
        )
    except Exception:
        print(
            "❌ Dialysis Visit Note checkbox rows did not appear."
        )
        return False

    search_page.wait_for_timeout(1000)

    print("✅ Dialysis Visit Note loaded")

    from_text = from_date.strftime(

        "%m/%d/%Y"

    )

    to_text = to_date.strftime(

        "%m/%d/%Y"

    )

    selection_result = search_page.evaluate(
        r"""
        ({fromText, toText}) => {
            const parseDate = s => {
                const m = String(s).match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
                return m ? new Date(+m[3], +m[1] - 1, +m[2]) : null;
            };
            const from = parseDate(fromText);
            const to = parseDate(toText);
            if (!from || !to) return {ok:false,error:"Invalid date range",selected:0,dates:[]};

            const candidates = [...document.querySelectorAll("table")]
                .map((table, index) => {
                    const visible = !!(table.offsetWidth || table.offsetHeight || table.getClientRects().length);
                    const rows = [...table.querySelectorAll("tbody tr")];
                    const usableRows = rows.filter(row =>
                        /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(row.innerText || "") &&
                        !!row.querySelector('input[type="checkbox"]')
                    );
                    return {table,index,visible,usableRows};
                })
                .filter(x => x.visible && x.usableRows.length > 0)
                .sort((a,b) => b.usableRows.length - a.usableRows.length);

            if (!candidates.length) return {ok:false,error:"No table containing date + checkbox rows found",selected:0,dates:[]};
            const chosen = candidates[0];

            for (const row of chosen.usableRows) {
                const boxes = [...row.querySelectorAll('input[type="checkbox"]')];
                if (boxes.length && boxes[boxes.length - 1].checked) boxes[boxes.length - 1].click();
            }

            let selected = 0;
            const dates = [];
            for (const row of chosen.usableRows) {
                const match = (row.innerText || "").match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
                if (!match) continue;
                const dateText = match[0];
                const date = parseDate(dateText);
                if (!date || date < from || date > to) continue;
                const boxes = [...row.querySelectorAll('input[type="checkbox"]')];
                if (!boxes.length) continue;
                const checkbox = boxes[boxes.length - 1];
                if (!checkbox.checked) checkbox.click();
                if (checkbox.checked) { selected++; dates.push(dateText); }
            }
            return {ok:true,selected,dates,tableIndex:chosen.index,usableRows:chosen.usableRows.length};
        }
        """,
        {"fromText": from_text, "toText": to_text}
    )
    if not selection_result.get("ok"):

        print(

            "❌",

            selection_result.get(

                "error",

                "Selection failed"

            )

        )

        return False

    selected = selection_result.get(

        "selected",

        0

    )

    selected_dates = selection_result.get(

        "dates",

        []

    )

    for date_text in selected_dates:

        print(

            "✅ Selected:",

            date_text

        )

    print("Total selected:", selected)

    if not selected:

        print(

            "❌ No Dialysis Visit Note "

            "found in requested date range."

        )

        # Nursing Progress Notes navigates directly in this same tab.
        print("⏩ No matching Dialysis Visit Notes; continuing immediately...")
        return False

    checked_count = search_page.evaluate(
        r"""
        () => {
            const candidates = [...document.querySelectorAll("table")]
                .map(table => {
                    const visible = !!(table.offsetWidth || table.offsetHeight || table.getClientRects().length);
                    const usableRows = [...table.querySelectorAll("tbody tr")].filter(row =>
                        /\b\d{1,2}\/\d{1,2}\/\d{4}\b/.test(row.innerText || "") &&
                        !!row.querySelector('input[type="checkbox"]')
                    );
                    return {visible, usableRows};
                })
                .filter(x => x.visible && x.usableRows.length > 0)
                .sort((a,b) => b.usableRows.length - a.usableRows.length);
            if (!candidates.length) return 0;
            return candidates[0].usableRows.filter(row => {
                const boxes = [...row.querySelectorAll('input[type="checkbox"]')];
                return boxes.length && boxes[boxes.length - 1].checked;
            }).length;
        }
        """
    )
    print(

        "Checkboxes actually checked:",

        checked_count

    )

    if checked_count == 0:

        print(

            "❌ Selection did not stick."

        )

        return False

    print("🖨️ Clicking Batch Print...")

    batch_result = search_page.evaluate(

        """

        () => {

            const buttons = [

                ...document.querySelectorAll(

                    "button"

                )

            ];



            const button = buttons.find(

                b =>

                    (b.innerText || "")

                    .trim() === "Batch Print"

                    &&

                    !b.hidden

            );



            if (!button) {

                return {

                    ok: false,

                    error: "Batch Print button not found"

                };

            }



            button.scrollIntoView({

                block: "center",

                inline: "center"

            });



            button.click();



            return {

                ok: true

            };

        }

        """

    )

    if not batch_result.get("ok"):

        print(

            "❌",

            batch_result.get(

                "error",

                "Batch Print failed"

            )

        )

        return False

    print("✅ Batch Print clicked")

    try:

        search_page.wait_for_selector(

            "#aDownload",

            state="visible",

            timeout=45000

        )

    except Exception:

        print(

            "❌ PDF modal did not appear"

        )

        return False

    print("✅ PDF modal appeared")

    download_link = search_page.locator(

        "#aDownload"

    )

    href = None

    for _ in range(100):

        try:

            href = download_link.get_attribute(

                "href"

            )

        except Exception:

            href = None

        if (

            href

            and href.startswith("blob:")

        ):

            break

        search_page.wait_for_timeout(100)

    print("PDF Blob URL:", href)

    if (

        not href

        or not href.startswith("blob:")

    ):

        print(

            "❌ Blob PDF URL was not ready."

        )

        return False

    safe_last = re.sub(

        r'[^A-Za-z0-9_-]',

        '_',

        last_name

    )

    safe_first = re.sub(

        r'[^A-Za-z0-9_-]',

        '_',

        first_name

    )

    browser_filename = (

        f"{safe_last}_{safe_first}_"

        "Dialysis_Visit_Note.pdf"

    )

    download_link.evaluate(

        """

        (element, filename) => {

            element.setAttribute(

                "download",

                filename

            );

        }

        """,

        browser_filename

    )

    os.makedirs(

        save_folder,

        exist_ok=True

    )

    save_name = build_filename(

        "Dialysis_Visit_Note",

        from_date,

        to_date,

        last_name,

        first_name

    )

    save_path = os.path.join(

        save_folder,

        save_name

    )

    print("⬇️ Clicking modal Download...")

    try:

        with search_page.expect_download(

            timeout=45000

        ) as download_info:

            download_link.click()

        download = download_info.value

        print(

            "✅ Browser download detected"

        )

        print(

            "Browser suggested filename:",

            download.suggested_filename

        )

        download.save_as(save_path)

    except Exception as e:

        print(

            "❌ Download failed:",

            e

        )

        return False

    if not os.path.exists(save_path):

        print("❌ File was not saved")

        return False

    print(

        "✅ DIALYSIS VISIT NOTE SAVED"

    )

    print("File:", save_path)

    close_button = search_page.locator(

        '.modal-content '

        'button[aria-label="Close"]'

    )

    if close_button.count() > 0:

        try:

            close_button.click()

        except Exception:

            pass

    # Skip browser Back; Nursing Progress Notes navigates directly in this same tab.
    print("⏩ Dialysis Visit Note complete; moving directly to Nursing Progress Notes...")
    search_page.bring_to_front()
    return True


def process_continuation_notes(

    search_page,

    from_date,

    to_date,

    save_folder,

    last_name,

    first_name

):

    wait_if_paused()

    print()

    print("==========================================")

    print("GENERAL CONTINUATION NOTES")

    print("==========================================")

    continuation_url = (

        "https://dmmtprod.renvio.com/"

        "EMR/dialysismanager/assessments/"

        "ContinuationNotes"

    )

    print("Current Search URL:")

    print(search_page.url)

    print()

    print(

        "➡️ Navigating SAME Search Patient tab "

        "to General Notes..."

    )

    search_page.bring_to_front()

    search_page.evaluate(

        """

        url => {

            window.location.href = url;

        }

        """,

        continuation_url

    )

    try:

        search_page.wait_for_url(

            "**/assessments/ContinuationNotes*",

            timeout=20000

        )

    except Exception:

        pass

    print("URL:", search_page.url)

    if (

        "login" in search_page.url.lower()

        or "logout" in search_page.url.lower()

    ):

        print("❌ Renvio logged out.")

        return False

    try:

        search_page.wait_for_selector(

            'tbody input[type="checkbox"]'

            '[title="Select for batch print"]',

            timeout=30000

        )

    except Exception:

        print(

            "❌ General Notes batch-print rows "

            "did not appear."

        )

        return False

    search_page.wait_for_timeout(1000)

    print("✅ General Notes loaded")

    from_text = from_date.strftime(

        "%m/%d/%Y"

    )

    to_text = to_date.strftime(

        "%m/%d/%Y"

    )

    selection_result = search_page.evaluate(

        r"""

        ({fromText, toText}) => {



            const parseDate = (text) => {

                const match = text.match(

                    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/

                );



                if (!match) return null;



                return new Date(

                    Number(match[3]),

                    Number(match[1]) - 1,

                    Number(match[2]),

                    12, 0, 0, 0

                );

            };



            const fromDate = parseDate(fromText);

            const toDate = parseDate(toText);



            if (!fromDate || !toDate) {

                return {

                    ok: false,

                    error: "Invalid date range",

                    selected: 0,

                    dates: []

                };

            }



            toDate.setHours(23, 59, 59, 999);



            const tables = [

                ...document.querySelectorAll(

                    "table.table.table-striped"

                )

            ];



            const table = tables.find(table =>

                table.querySelector(

                    'tbody input[type="checkbox"]' +

                    '[title="Select for batch print"]'

                )

            );



            if (!table) {

                return {

                    ok: false,

                    error: "General Notes table not found",

                    selected: 0,

                    dates: []

                };

            }



            const checkboxes = table.querySelectorAll(

                'tbody input[type="checkbox"]' +

                '[title="Select for batch print"]'

            );



            checkboxes.forEach(cb => {

                if (cb.checked) {

                    cb.click();

                }

            });



            const rows = [

                ...table.querySelectorAll(

                    "tbody tr"

                )

            ];



            let selected = 0;

            const selectedDates = [];



            rows.forEach(row => {

                const cells = [

                    ...row.querySelectorAll("td")

                ];



                if (!cells.length) return;



                let dateText = null;

                let noteDate = null;



                for (const cell of cells) {

                    const text = (

                        cell.innerText || ""

                    ).trim();



                    const date = parseDate(text);



                    if (date) {

                        const match = text.match(

                            /\b\d{1,2}\/\d{1,2}\/\d{4}\b/

                        );



                        if (match) {

                            dateText = match[0];

                            noteDate = date;

                            break;

                        }

                    }

                }



                if (!noteDate) return;



                if (

                    noteDate >= fromDate &&

                    noteDate <= toDate

                ) {

                    const checkbox = row.querySelector(

                        'input[type="checkbox"]' +

                        '[title="Select for batch print"]'

                    );



                    if (

                        checkbox &&

                        !checkbox.checked

                    ) {

                        checkbox.click();

                        selected++;

                        selectedDates.push(

                            dateText

                        );

                    }

                }

            });



            return {

                ok: true,

                selected: selected,

                dates: selectedDates

            };

        }

        """,

        {

            "fromText": from_text,

            "toText": to_text

        }

    )

    if not selection_result.get("ok"):

        print(

            "❌",

            selection_result.get(

                "error",

                "Selection failed"

            )

        )

        return False

    selected = selection_result.get(

        "selected",

        0

    )

    selected_dates = selection_result.get(

        "dates",

        []

    )

    for date_text in selected_dates:

        print(

            "✅ Selected:",

            date_text

        )

    print("Total selected:", selected)

    if not selected:

        print(

            "❌ No General Continuation Notes "

            "found in requested date range."

        )

        return False

    checked_count = search_page.evaluate(

        """

        () => {

            const tables = [

                ...document.querySelectorAll(

                    "table.table.table-striped"

                )

            ];



            const table = tables.find(table =>

                table.querySelector(

                    'tbody input[type="checkbox"]' +

                    '[title="Select for batch print"]'

                )

            );



            if (!table) return 0;



            return table.querySelectorAll(

                'tbody input[type="checkbox"]' +

                '[title="Select for batch print"]:checked'

            ).length;

        }

        """

    )

    print(

        "Checkboxes actually checked:",

        checked_count

    )

    if checked_count == 0:

        print(

            "❌ Selection did not stick."

        )

        return False

    print("🖨️ Clicking Batch Print...")

    batch_result = search_page.evaluate(

        """

        () => {

            const buttons = [

                ...document.querySelectorAll(

                    "button"

                )

            ];



            const button = buttons.find(

                b =>

                    (b.innerText || "")

                    .trim() === "Batch Print"

                    &&

                    !b.hidden

            );



            if (!button) {

                return {

                    ok: false,

                    error: "Batch Print button not found"

                };

            }



            button.scrollIntoView({

                block: "center",

                inline: "center"

            });



            button.click();



            return {

                ok: true

            };

        }

        """

    )

    if not batch_result.get("ok"):

        print(

            "❌",

            batch_result.get(

                "error",

                "Batch Print failed"

            )

        )

        return False

    print("✅ Batch Print clicked")

    try:

        search_page.wait_for_selector(

            "#aDownload",

            state="visible",

            timeout=45000

        )

    except Exception:

        print(

            "❌ PDF modal did not appear"

        )

        return False

    print("✅ PDF modal appeared")

    download_link = search_page.locator(

        "#aDownload"

    )

    href = None

    for _ in range(100):

        try:

            href = download_link.get_attribute(

                "href"

            )

        except Exception:

            href = None

        if (

            href

            and href.startswith("blob:")

        ):

            break

        search_page.wait_for_timeout(100)

    print("PDF Blob URL:", href)

    if (

        not href

        or not href.startswith("blob:")

    ):

        print(

            "❌ Blob PDF URL was not ready."

        )

        return False

    safe_last = re.sub(

        r'[^A-Za-z0-9_-]',

        '_',

        last_name

    )

    safe_first = re.sub(

        r'[^A-Za-z0-9_-]',

        '_',

        first_name

    )

    browser_filename = (

        f"{safe_last}_{safe_first}_"

        "General_Continuation_Notes.pdf"

    )

    download_link.evaluate(

        """

        (element, filename) => {

            element.setAttribute(

                "download",

                filename

            );

        }

        """,

        browser_filename

    )

    os.makedirs(

        save_folder,

        exist_ok=True

    )

    save_name = build_filename(

        "General_Continuation_Notes",

        from_date,

        to_date,

        last_name,

        first_name

    )

    save_path = os.path.join(

        save_folder,

        save_name

    )

    print("⬇️ Clicking modal Download...")

    try:

        with search_page.expect_download(

            timeout=45000

        ) as download_info:

            download_link.click()

        download = download_info.value

        print(

            "✅ Browser download detected"

        )

        print(

            "Browser suggested filename:",

            download.suggested_filename

        )

        download.save_as(save_path)

    except Exception as e:

        print(

            "❌ Download failed:",

            e

        )

        return False

    if not os.path.exists(save_path):

        print("❌ File was not saved")

        return False

    print(

        "✅ GENERAL CONTINUATION NOTES SAVED"

    )

    print("File:", save_path)

    close_button = search_page.locator(

        '.modal-content '

        'button[aria-label="Close"]'

    )

    if close_button.count() > 0:

        try:

            close_button.click()

        except Exception:

            pass

    search_page.bring_to_front()

    return True


# ============================================================

# AUTOMATION

# ============================================================


def run_automation(

    from_date,

    to_date,

    last_name,

    first_name

):

    os.makedirs(

        SAVE_FOLDER,

        exist_ok=True

    )

    with sync_playwright() as p:

        browser = p.chromium.connect_over_cdp(

            "http://127.0.0.1:9222"

        )

        if not browser.contexts:

            print("❌ No browser context")

            return

        context = browser.contexts[0]

        search_page = find_search_page(

            context

        )

        if not search_page:

            print(

                "❌ Patient Search tab not found"

            )

            return

        search_patient(

            search_page,

            last_name,

            first_name

        )
        time.sleep(1)
        hd_start_url = (

            "https://dmmtprod.renvio.com/EMR/dialysismanager/w4/a?"

            "p=L1dlYkZvcm1zL0RpYWx5c2lzL0hEVHJlYXRtZW50Rmxvd3NoZWV0LmFzcHgm"

            "TWVudU5hbWU9SEQgRmxvd3NoZWV0cyZNZW51SUQ9MjEmXz0xNzg4MTQwNTk2NDIz"

        )

        print(

            "➡️ Moving to HD Flowsheets page..."

        )

        search_page.evaluate(

            """

            url => {

                window.location.href = url;

            }

            """,

            hd_start_url

        )

        # Wait for the HD navigation to settle, but never more than 10 seconds.

        print("⏳ Waiting for HD Flowsheets page (max 10 seconds)...")

        try:

            search_page.wait_for_load_state(

                "domcontentloaded",

                timeout=10000

            )

        except Exception:

            pass

        # The wrapper page can finish DOMContentLoaded before its inner

        # navigation is fully ready, so allow a brief capped settle period.

        try:

            search_page.wait_for_timeout(1500)

        except Exception:

            pass

        print("✅ Continuing automation...")

        results = {}

        results["HD Flowsheets"] = run_document(

            context,

            search_page,

            PAGE_URLS["HD_Flowsheets"],

            "HD Flowsheets",

            from_date,

            to_date,

            process_hd_flowsheet,

            last_name,

            first_name

        )

        results[

            "Hemodialysis Order"

        ] = run_document(

            context,

            search_page,

            PAGE_URLS["Hemodialysis_Order"],

            "Hemodialysis Order",

            from_date,

            to_date,

            process_hemodialysis_order,

            last_name,

            first_name

        )
        search_page.bring_to_front()

        dialysis_visit_note_ok = (
            process_dialysis_visit_note_same_tab(
                search_page=search_page,
                from_date=from_date,
                to_date=to_date,
                save_folder=SAVE_FOLDER,
                last_name=last_name,
                first_name=first_name
            )
        )

        results[
            "Dialysis Visit Note"
        ] = dialysis_visit_note_ok

        search_page.bring_to_front()

        progress_notes_ok = (


            process_nursing_progress_notes(

                search_page=search_page,

                from_date=from_date,

                to_date=to_date,

                save_folder=SAVE_FOLDER,

                last_name=last_name,

                first_name=first_name

            )

        )

        results[

            "Nursing Progress Notes"

        ] = progress_notes_ok

        continuation_notes_ok = (

            process_continuation_notes(

                search_page=search_page,

                from_date=from_date,

                to_date=to_date,

                save_folder=SAVE_FOLDER,

                last_name=last_name,

                first_name=first_name

            )

        )

        results[

            "Continuation Notes"

        ] = continuation_notes_ok

        search_page.bring_to_front()

        results["No Show Treatment"] = process_no_show_treatment(
            search_page, from_date, to_date, SAVE_FOLDER,
            last_name, first_name
        )

        print("\n===== FINISHED =====")

        for name, success in results.items():

            print(

                "✅" if success else "❌",

                name

            )

        try:

            os.startfile(SAVE_FOLDER)

        except Exception:

            pass


# ============================================================
# NO SHOW TREATMENT (Angular page / ngx-table)
# ============================================================

NO_SHOW_URL = (
    "https://dmmtprod.renvio.com/EMR/dialysismanager/"
    "Dialysis/NoShowTreatment"
)


def process_no_show_treatment(search_page, from_date, to_date,
                              save_folder, last_name, first_name):
    """Select date-matching No Show rows and capture Batch Print PDF."""
    print("\n===== NO SHOW TREATMENT =====")
    try:
        # Stay in the same patient session/tab as other Angular pages.
        search_page.goto(
            NO_SHOW_URL, wait_until="domcontentloaded", timeout=30000)
        table = search_page.locator("ngx-table table.table-striped").first
        table.wait_for(state="visible", timeout=20000)

        # The supplied HTML has a 10/25/50/100 page-size selector.
        size = search_page.locator(
            "app-pagination select[name='pageSize']").first
        if size.count():
            try:
                size.select_option(label="100")
                search_page.wait_for_timeout(500)
            except Exception as exc:
                print("⚠️ Could not select 100 rows:", exc)

        table.wait_for(state="visible", timeout=15000)
        rows = table.locator("tbody tr")
        chosen = 0
        for i in range(rows.count()):
            row = rows.nth(i)
            date_text = row.locator(
                "td:not([hidden])").first.inner_text().strip()
            try:
                record_date = datetime.strptime(date_text, "%m/%d/%Y").date()
            except ValueError:
                print("⚠️ Unrecognized No Show date:", date_text)
                continue
            checkbox = row.locator("input[type='checkbox']").first
            if checkbox.count() == 0:
                continue
            if (from_date.date() if isinstance(from_date, datetime) else from_date) <= record_date <= (to_date.date() if isinstance(to_date, datetime) else to_date):
                checkbox.check()
                chosen += 1
                print("✅", date_text)
            elif checkbox.is_checked():
                checkbox.uncheck()

        # Do not silently omit later pages if a patient has >100 records.
        pagination = search_page.locator("app-pagination nav")
        if pagination.count() and pagination.first.locator("a, button").count():
            print("⚠️ Pagination controls detected. Check for additional pages.")

        if not chosen:
            print("ℹ️ No No Show records within selected dates")
            return True

        buttons = search_page.get_by_role(
            "button", name="Batch Print", exact=True)
        if not buttons.count():
            print("❌ No Show Batch Print button not found")
            return False
        filename = build_filename("No_Show_Treatment", from_date, to_date,
                                  last_name, first_name)
        save_path = os.path.join(save_folder, filename)
        buttons.first.click()

        # No Show Batch Print opens an Angular PDF modal with a blob: link,
        # rather than returning a PDF response that capture_pdf can detect.
        link = search_page.locator(
            'ngb-modal-window a#aDownload[download]'
        ).first
        link.wait_for(state="visible", timeout=60000)

        # Prefer the browser's native download handling.
        try:
            link.evaluate("el => el.removeAttribute('target')")
            with search_page.expect_download(timeout=15000) as download_info:
                link.click()
            download_info.value.save_as(save_path)
        except Exception as download_exc:
            print("⚠️ Native No Show download unavailable:", download_exc)
            # Fallback: read the already-generated blob in the same page.
            # This avoids a second print request and handles browser setups
            # that don't emit a Playwright download event for blob links.
            import base64
            encoded = link.evaluate("""async el => {
                const response = await fetch(el.href);
                if (!response.ok) throw new Error('Blob fetch failed: ' + response.status);
                const blob = await response.blob();
                return await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(blob);
                });
            }""")
            pdf_bytes = base64.b64decode(encoded)
            if not pdf_bytes.startswith(b"%PDF"):
                raise ValueError("No Show blob did not contain a PDF")
            with open(save_path, "wb") as output:
                output.write(pdf_bytes)

        print("✅ NO SHOW SAVED:", save_path)
        close_button = search_page.locator(
            'ngb-modal-window button[aria-label="Close"]'
        )
        if close_button.count():
            close_button.first.click()
        return True
    except Exception as exc:
        print("❌ No Show Treatment:", exc)
        return False


# ============================================================

# AUTOMATIC CHROME REMOTE-DEBUGGING STARTUP

# ============================================================


CHROME_DEBUG_PORT = 9222


CHROME_PROFILE_FOLDER = os.path.join(

    os.environ.get(

        "LOCALAPPDATA",

        os.path.expanduser("~")

    ),

    "RenvioChromeProfile"

)


def is_debug_port_open(

    host="127.0.0.1",

    port=CHROME_DEBUG_PORT

):

    try:

        with socket.create_connection(

            (host, port),

            timeout=0.5

        ):

            return True

    except OSError:

        return False


def find_chrome_executable():

    candidates = []

    program_files = os.environ.get(

        "PROGRAMFILES"

    )

    program_files_x86 = os.environ.get(

        "PROGRAMFILES(X86)"

    )

    local_app_data = os.environ.get(

        "LOCALAPPDATA"

    )

    if program_files:

        candidates.append(

            os.path.join(

                program_files,

                "Google",

                "Chrome",

                "Application",

                "chrome.exe"

            )

        )

    if program_files_x86:

        candidates.append(

            os.path.join(

                program_files_x86,

                "Google",

                "Chrome",

                "Application",

                "chrome.exe"

            )

        )

    if local_app_data:

        candidates.append(

            os.path.join(

                local_app_data,

                "Google",

                "Chrome",

                "Application",

                "chrome.exe"

            )

        )

    for path in candidates:

        if os.path.exists(path):

            return path

    return None


def ensure_debug_chrome():

    if is_debug_port_open():

        print(

            "✅ Chrome remote debugging is already running "

            f"on port {CHROME_DEBUG_PORT}"

        )

        return True

    chrome = find_chrome_executable()

    if not chrome:

        raise RuntimeError(

            "Google Chrome was not found. "

            "Install Chrome or update "

            "find_chrome_executable()."

        )

    os.makedirs(

        CHROME_PROFILE_FOLDER,

        exist_ok=True

    )

    print()

    print(

        "🌐 Starting Chrome automatically..."

    )

    print("Chrome:", chrome)

    print(

        "Automation profile:",

        CHROME_PROFILE_FOLDER

    )

    creation_flags = 0

    if os.name == "nt":

        creation_flags = (

            getattr(

                subprocess,

                "CREATE_NEW_PROCESS_GROUP",

                0

            )

            |

            getattr(

                subprocess,

                "DETACHED_PROCESS",

                0

            )

        )

    subprocess.Popen(

        [

            chrome,

            f"--remote-debugging-port={CHROME_DEBUG_PORT}",

            f"--user-data-dir={CHROME_PROFILE_FOLDER}",

            "--no-first-run",

            "--no-default-browser-check",

            "https://dmmtprod.renvio.com/"

        ],

        stdout=subprocess.DEVNULL,

        stderr=subprocess.DEVNULL,

        creationflags=creation_flags

    )

    for _ in range(100):

        if is_debug_port_open():

            print(

                "✅ Chrome remote debugging is ready"

            )

            return True

        time.sleep(0.1)

    raise RuntimeError(

        "Chrome opened, but remote debugging "

        f"did not become available on port "

        f"{CHROME_DEBUG_PORT}."

    )


# ============================================================

# HTML-SELECT-LIKE MONTH COMBOBOX

# ============================================================


class HtmlSelectMonthCombobox(ttk.Combobox):

    """

    Behaves like an HTML <select>:

    - Click the arrow to choose a month.

    - Type letters to jump to a matching month.

    - Press TAB to move to the next field.

    - The month value itself is not directly editable.

    """

    def __init__(self, master=None, **kwargs):

        kwargs.setdefault("values", MONTHS)

        kwargs.setdefault("state", "readonly")

        super().__init__(master, **kwargs)

        self._type_buffer = ""

        self._buffer_job = None

        self.bind("<KeyPress>", self._on_keypress, add="+")

    def _clear_buffer(self):

        self._type_buffer = ""

        self._buffer_job = None

    def _on_keypress(self, event):

        if event.keysym in {

            "Tab", "ISO_Left_Tab",

            "Up", "Down", "Left", "Right",

            "Return", "Escape", "Home", "End"

        }:

            return None

        char = (event.char or "").upper()

        if not char.isalpha():

            return "break"

        if self._buffer_job is not None:

            try:

                self.after_cancel(self._buffer_job)

            except Exception:

                pass

        self._type_buffer += char

        match = None

        for month in MONTHS:

            if month.startswith(self._type_buffer):

                match = month

                break

        if match is None:

            self._type_buffer = char

            for month in MONTHS:

                if month.startswith(self._type_buffer):

                    match = month

                    break

        if match is not None:

            self.set(match)

        self._buffer_job = self.after(

            800,

            self._clear_buffer

        )

        return "break"


# ============================================================

# DESKTOP APP

# ============================================================


class RenvioDownloaderApp:

    def __init__(self, root):

        self.root = root

        self.last_name_var = tk.StringVar(

            value=LAST_NAME

        )

        self.first_name_var = tk.StringVar(

            value=FIRST_NAME

        )

        self.manual_var = tk.BooleanVar(value=False)
        self.patient_selection_var = tk.StringVar()
        self.patient_choices = {
            f"{subject_id} - {first} {last}": (subject_id, first, last)
            for subject_id, first, last in PATIENTS
        }
        today = datetime.now().date()

        self.from_day_var = tk.StringVar(

            value=f"{today.day:02d}"

        )

        self.from_month_var = tk.StringVar(

            value=MONTHS[today.month - 1]

        )

        self.from_year_var = tk.StringVar(

            value=str(today.year)

        )

        self.to_day_var = tk.StringVar(

            value=f"{today.day:02d}"

        )

        self.to_month_var = tk.StringVar(

            value=MONTHS[today.month - 1]

        )

        self.to_year_var = tk.StringVar(

            value=str(today.year)

        )

        self.file_prefix_var = tk.StringVar(

            value=""

        )

        self.folder_var = tk.StringVar(

            value=DEFAULT_SAVE_FOLDER

        )

        self.is_paused = False

        self.filename_vars = {

            "HD_Flowsheets": tk.StringVar(

                value="HD Flowsheets"

            ),

            "Dialysis_Visit_Note": tk.StringVar(

                value="Dialysis Visit Note"

            ),

            "Hemodialysis_Order": tk.StringVar(

                value="Hemodialysis Order"

            ),

            "Nursing_Progress_Notes": tk.StringVar(

                value="Nursing Progress Notes"

            ),

            "General_Continuation_Notes": tk.StringVar(

                value="General Continuation Notes"

            ),

            "No_Show_Treatment": tk.StringVar(value="No Show Treatment"),

        }

        root.title(

            "Renvio PDF Downloader"

        )

        root.geometry(

            "720x850"

        )

        root.minsize(

            650,

            650

        )

        self.root = root
        self.build_ui()
        self.toggle_patient_mode()

    def build_ui(self):

        outer = ttk.Frame(self.root)
        outer.pack(fill="both", expand=True)

        canvas = tk.Canvas(outer, highlightthickness=0)
        scrollbar = ttk.Scrollbar(
            outer,
            orient="vertical",
            command=canvas.yview
        )

        scrollbar.pack(side="right", fill="y")
        canvas.pack(side="left", fill="both", expand=True)
        canvas.configure(yscrollcommand=scrollbar.set)

        container = ttk.Frame(canvas, padding=20)
        window_id = canvas.create_window(
            (0, 0),
            window=container,
            anchor="nw"
        )

        # Update the scrollable area when the form changes size.
        container.bind(
            "<Configure>",
            lambda event: canvas.configure(
                scrollregion=canvas.bbox("all")
            )
        )

        # Keep the form as wide as the window.
        canvas.bind(
            "<Configure>",
            lambda event: canvas.itemconfigure(
                window_id,
                width=event.width
            )
        )

        ttk.Label(

            container,

            text="Renvio PDF Downloader",

            font=(

                "Segoe UI",

                18,

                "bold"

            )

        ).pack(

            anchor="w",

            pady=(0, 18)

        )

        # Patient selection: default ID-based mode, optional original manual mode.
        patient = ttk.LabelFrame(container, text="Patient", padding=15)
        patient.pack(fill="x", pady=(0, 15))

        ttk.Checkbutton(
            patient, text="Manual", variable=self.manual_var,
            command=self.toggle_patient_mode
        ).pack(anchor="w", pady=(0, 8))

        self.dropdown_frame = ttk.Frame(patient)
        self.dropdown_frame.pack(fill="x")
        ttk.Label(self.dropdown_frame,
                  text="Type Subject ID or patient name").pack(anchor="w")
        self.patient_combo = ttk.Combobox(
            self.dropdown_frame, textvariable=self.patient_selection_var,
            values=list(self.patient_choices), state="normal", height=18
        )
        self.patient_combo.pack(fill="x", pady=(5, 0))
        self.patient_combo.bind("<KeyRelease>", self.filter_patients)
        self.patient_combo.bind("<Return>", self.choose_first_patient)
        self.patient_combo.bind("<<ComboboxSelected>>",
                                self.on_patient_selected)

        self.manual_patient_frame = ttk.Frame(patient)
        ttk.Label(self.manual_patient_frame, text="Last Name").grid(
            row=0, column=0, sticky="w")
        ttk.Entry(self.manual_patient_frame, textvariable=self.last_name_var).grid(
            row=1, column=0, sticky="ew", padx=(0, 15), pady=(5, 0))
        ttk.Label(self.manual_patient_frame, text="First Name").grid(
            row=0, column=1, sticky="w")
        ttk.Entry(self.manual_patient_frame, textvariable=self.first_name_var).grid(
            row=1, column=1, sticky="ew", pady=(5, 0))
        self.manual_patient_frame.columnconfigure(0, weight=1)
        self.manual_patient_frame.columnconfigure(1, weight=1)

        # Date Range

        dates = ttk.LabelFrame(

            container,

            text="Date Range",

            padding=15

        )

        dates.pack(

            fill="x",

            pady=(0, 15)

        )

        ttk.Label(

            dates,

            text="From date"

        ).grid(

            row=0,

            column=0,

            sticky="w",

            columnspan=3

        )

        from_frame = ttk.Frame(dates)

        from_frame.grid(

            row=1,

            column=0,

            columnspan=3,

            sticky="w",

            padx=(0, 25),

            pady=(5, 0)

        )

        ttk.Entry(

            from_frame,

            textvariable=self.from_day_var,

            width=7,

            justify="center"

        ).grid(row=0, column=0)

        HtmlSelectMonthCombobox(

            from_frame,

            textvariable=self.from_month_var,

            width=7,

            justify="center"

        ).grid(

            row=0,

            column=1,

            padx=5

        )

        ttk.Entry(

            from_frame,

            textvariable=self.from_year_var,

            width=6,

            justify="center"

        ).grid(row=0, column=2)

        ttk.Label(

            dates,

            text="To date"

        ).grid(

            row=0,

            column=3,

            sticky="w",

            columnspan=3

        )

        to_frame = ttk.Frame(dates)

        to_frame.grid(

            row=1,

            column=3,

            columnspan=3,

            sticky="w",

            pady=(5, 0)

        )

        ttk.Entry(

            to_frame,

            textvariable=self.to_day_var,

            width=7,

            justify="center"

        ).grid(row=0, column=0)

        HtmlSelectMonthCombobox(

            to_frame,

            textvariable=self.to_month_var,

            width=7,

            justify="center"

        ).grid(

            row=0,

            column=1,

            padx=5

        )

        ttk.Entry(

            to_frame,

            textvariable=self.to_year_var,

            width=6,

            justify="center"

        ).grid(row=0, column=2)

        ttk.Label(

            dates,

            text="Format: DD  MMM  YYYY    Example: 01  SEP  2026"

        ).grid(

            row=2,

            column=0,

            columnspan=6,

            sticky="w",

            pady=(8, 0)

        )

        dates.columnconfigure(0, weight=1)

        dates.columnconfigure(3, weight=1)

        # File prefix

        self.prefix_frame = ttk.LabelFrame(

            container,

            text="File Name Prefix",

            padding=15

        )

        self.prefix_frame.pack(

            fill="x",

            pady=(0, 15)

        )

        ttk.Label(

            self.prefix_frame,

            text=(

                "Added before every downloaded PDF filename."

            )

        ).pack(

            anchor="w"

        )

        ttk.Entry(

            self.prefix_frame,

            textvariable=self.file_prefix_var

        ).pack(

            fill="x",

            pady=(5, 0)

        )

        # PDF filenames

        files = ttk.LabelFrame(

            container,

            text="PDF File Names",

            padding=15

        )

        self.files_frame = files

        files.pack(

            fill="x",

            pady=(0, 15)

        )

        filename_rows = [

            (

                "HD Flowsheets",

                "HD_Flowsheets"

            ),

            (

                "Dialysis Visit Note",

                "Dialysis_Visit_Note"

            ),

            (

                "Hemodialysis Order",

                "Hemodialysis_Order"

            ),

            (

                "Nursing Progress Notes",

                "Nursing_Progress_Notes"

            ),

            (

                "General Notes",

                "General_Continuation_Notes"

            ),

            ("No Show Treatment", "No_Show_Treatment"),

        ]

        for row, (label, key) in enumerate(

            filename_rows

        ):

            ttk.Label(

                files,

                text=label

            ).grid(

                row=row,

                column=0,

                sticky="w",

                pady=5

            )

            ttk.Entry(

                files,

                textvariable=self.filename_vars[

                    key

                ]

            ).grid(

                row=row,

                column=1,

                sticky="ew",

                padx=(15, 0),

                pady=5

            )

        files.columnconfigure(

            1,

            weight=1

        )

        ttk.Label(

            files,

            text=(

                "Prefix, patient name, and date range "

                "are automatically added."

            )

        ).grid(

            row=len(filename_rows),

            column=0,

            columnspan=2,

            sticky="w",

            pady=(10, 0)

        )

        # Save Folder

        folder = ttk.LabelFrame(

            container,

            text="Save Folder",

            padding=15

        )

        folder.pack(

            fill="x",

            pady=(0, 15)

        )

        ttk.Entry(

            folder,

            textvariable=self.folder_var

        ).pack(

            side="left",

            fill="x",

            expand=True

        )

        ttk.Button(

            folder,

            text="Browse...",

            command=self.choose_folder

        ).pack(

            side="left",

            padx=(10, 0)

        )

        controls = ttk.Frame(container)

        controls.pack(

            fill="x",

            pady=(5, 10)

        )

        self.run_button = ttk.Button(

            controls,

            text="Run Download",

            command=self.start_run

        )

        self.run_button.pack(

            side="left",

            fill="x",

            expand=True,

            ipady=8

        )

        self.pause_button = ttk.Button(

            controls,

            text="Exit",

            command=self.exit_application,

            state="disabled"

        )

        self.pause_button.pack(

            side="left",

            padx=(10, 0),

            ipady=8

        )

        self.status_var = tk.StringVar(

            value=(

                "Ready. The app will start the required "

                "Chrome automation window automatically."

            )

        )

        ttk.Label(

            container,

            textvariable=self.status_var,

            wraplength=650

        ).pack(

            anchor="w"

        )

    def exit_application(self):
        """Immediately terminate the app and its running download worker."""
        self.status_var.set("Exiting...")
        self.root.update_idletasks()
        os._exit(0)

    def choose_folder(self):

        selected = filedialog.askdirectory(

            initialdir=(

                self.folder_var.get()

                or DEFAULT_SAVE_FOLDER

            )

        )

        if selected:

            self.folder_var.set(selected)

    def toggle_patient_mode(self):
        if self.manual_var.get():
            self.dropdown_frame.pack_forget()
            self.manual_patient_frame.pack(fill="x")
        else:
            self.manual_patient_frame.pack_forget()
            self.dropdown_frame.pack(fill="x")

    def filter_patients(self, event=None):
        # Editable combobox: preserve typed text; filter only the choices.
        if event is not None and event.keysym in (
            "Up", "Down", "Left", "Right", "Return", "Tab", "Escape"
        ):
            return
        query = self.patient_selection_var.get().strip().casefold()
        matching = [label for label in self.patient_choices
                    if query in label.casefold()]
        self.patient_combo.configure(values=matching)

    def choose_first_patient(self, event=None):
        query = self.patient_selection_var.get().strip().casefold()
        matches = [label for label in self.patient_choices
                   if query in label.casefold()]
        if matches:
            self.patient_selection_var.set(matches[0])
            self.on_patient_selected()
        return "break"

    def on_patient_selected(self, event=None):
        selection = self.patient_selection_var.get().strip()
        patient = self.patient_choices.get(selection)
        if patient:
            subject_id, first, last = patient
            self.file_prefix_var.set(subject_id)
            self.first_name_var.set(first)
            self.last_name_var.set(last)

    def start_run(self):

        try:

            from_date = parse_split_date(

                self.from_day_var.get(),

                self.from_month_var.get(),

                self.from_year_var.get()

            )

            to_date = parse_split_date(

                self.to_day_var.get(),

                self.to_month_var.get(),

                self.to_year_var.get()

            )

        except ValueError as e:

            messagebox.showerror(

                "Invalid Date",

                str(e) + "\n\n"

                "Use DD / MMM / YYYY. Example: 01 / SEP / 2026"

            )

            return

        if from_date > to_date:

            messagebox.showerror(

                "Invalid Date Range",

                "From date cannot be after To date."

            )

            return

        if self.manual_var.get():
            last_name = self.last_name_var.get().strip()
            first_name = self.first_name_var.get().strip()
            prefix_value = self.file_prefix_var.get().strip()
            if not last_name or not first_name:
                messagebox.showerror("Missing Patient Name",
                                     "Enter both Last Name and First Name.")
                return
        else:
            selected = self.patient_choices.get(
                self.patient_selection_var.get().strip())
            if not selected:
                messagebox.showerror("Select Patient",
                                     "Choose a patient from the Subject ID dropdown.")
                return
            _, first_name, last_name = selected
            prefix_value = self.file_prefix_var.get().strip()
            self.first_name_var.set(first_name)
            self.last_name_var.set(last_name)

        global SAVE_FOLDER

        global CUSTOM_FILENAMES

        global FILE_PREFIX

        SAVE_FOLDER = (

            self.folder_var.get().strip()

            or DEFAULT_SAVE_FOLDER

        )

        FILE_PREFIX = prefix_value

        CUSTOM_FILENAMES = {

            key: value.get().strip()

            for key, value

            in self.filename_vars.items()

        }

        os.makedirs(

            SAVE_FOLDER,

            exist_ok=True

        )

        PAUSE_EVENT.set()

        self.is_paused = False

        self.run_button.config(

            state="disabled"

        )

        self.pause_button.config(

            state="normal",

            text="Exit"

        )

        self.status_var.set(

            "Running automation..."

        )

        thread = threading.Thread(

            target=self.run_worker,

            args=(

                from_date,

                to_date,

                last_name,

                first_name

            ),

            daemon=True

        )

        thread.start()

    def run_worker(

        self,

        from_date,

        to_date,

        last_name,

        first_name

    ):

        try:

            self.root.after(

                0,

                lambda: self.status_var.set(

                    "Checking Chrome..."

                )

            )

            ensure_debug_chrome()

            self.root.after(

                0,

                lambda: self.status_var.set(

                    "Chrome is ready. "

                    "Running Renvio automation..."

                )

            )

            run_automation(

                from_date,

                to_date,

                last_name,

                first_name

            )

            self.root.after(

                0,

                lambda: self.finish_run(

                    True,

                    None

                )

            )

        except Exception as e:

            self.root.after(

                0,

                lambda error=str(e):

                    self.finish_run(

                        False,

                        error

                )

            )

    def finish_run(

        self,

        success,

        error

    ):

        PAUSE_EVENT.set()

        self.is_paused = False

        self.run_button.config(

            state="normal"

        )

        self.pause_button.config(

            state="disabled",

            text="Exit"

        )

        if success:

            self.status_var.set(

                "Finished."

            )

            messagebox.showinfo(

                "Finished",

                "Renvio download process finished."

            )

        else:

            self.status_var.set(

                "Failed."

            )

            messagebox.showerror(

                "Automation Error",

                error or "Unknown error"

            )


def main():

    root = tk.Tk()

    RenvioDownloaderApp(

        root

    )

    root.mainloop()


if __name__ == "__main__":

    main()
