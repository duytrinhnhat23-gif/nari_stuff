const log = document.querySelector('#log');

log.querySelectorAll('input:not([type="button"]):not([type="submit"]):not([type="image"]):not([type="hidden"]), textarea, select')
    .forEach(el => {
        if (el.tagName === 'SELECT') {
            el.selectedIndex = 0;
        } else if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = false;
        } else {
            el.value = '';
        }
    });