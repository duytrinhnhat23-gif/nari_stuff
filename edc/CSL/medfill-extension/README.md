# Rave Medication Filler

Chrome/Edge Manifest V3 extension.

## Install

1. Unzip the extension.
2. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the `rave_medication_filler_extension` folder.

## Use

1. Open the Medidata Rave Prior/Concomitant Medication record.
2. Click the yellow **M** extension icon.
3. Paste medication data using:

   Medication | Dose | Dose Unit | Route | Frequency | Start Date | End Date/Ongoing | Indication | Identifier

4. Set **Row to fill**.
5. Click **Fill Page**.

The popup remembers the data and selected row.

You can also press **F2** on the Rave page to fill the currently selected row.

## Example

Epogen | 7000 | IU | IV | TIW | 24-Jan-2026 | 06-Mar-2026 | Medical History | 007

## Behavior

- Dose Unit is entered exactly as supplied.
- Route maps abbreviations such as IV -> Intravenous and PO -> Oral.
- Frequency maps abbreviations such as TIW -> 3 Times Per Week.
- Dates are split into the Rave day/month/year controls.
- Indication uses the exact visible Rave option.
- AE/MH identifier waits for its AJAX SearchList.
- Save is NOT clicked automatically. Review the record before saving.

## Note

F2 support uses a content script on web pages, so the extension requests page access. The actual fill operation is only triggered when you click Fill Page or press F2.
