/* eslint-disable no-unused-vars */

// NOTE: This file must be in the top-level directory of the extension according to the docs
import { executeInCurrentTab, wrapResponse } from './src/background/utils.js';

const DEFAULT_COLOR_TITLE = "yellow";

// Add option when right-clicking
browser.runtime.onInstalled.addListener(async () => {
    // remove existing menu items
    browser.contextMenus.removeAll();

    browser.contextMenus.create({ title: 'Highlight', id: 'highlight', contexts: ['selection'] });
    browser.contextMenus.create({ title: 'Toggle Cursor', id: 'toggle-cursor' });
    browser.contextMenus.create({ title: 'Highlighter color', id: 'highlight-colors' });
    browser.contextMenus.create({ title: 'Yellow', id: 'yellow', parentId: 'highlight-colors', type: 'radio' });
    browser.contextMenus.create({ title: 'Blue', id: 'blue', parentId: 'highlight-colors', type: 'radio' });
    browser.contextMenus.create({ title: 'Green', id: 'green', parentId: 'highlight-colors', type: 'radio' });
    browser.contextMenus.create({ title: 'Pink', id: 'pink', parentId: 'highlight-colors', type: 'radio' });
    browser.contextMenus.create({ title: "Dark", id: "dark", parentId: "highlight-colors", type: "radio" });

    // Get the initial selected color value
    const { title: colorTitle } = await getCurrentColor();
    browser.contextMenus.update(colorTitle, { checked: true });
});

browser.contextMenus.onClicked.addListener(({ menuItemId, parentMenuItemId }) => {
    if (parentMenuItemId === 'highlight-color') {
        changeColorFromContext(menuItemId);
        return;
    }

    switch (menuItemId) {
        case 'highlight':
            highlightTextFromContext();
            break;
        case 'toggle-cursor':
            toggleHighlighterCursorFromContext();
            break;
    }
});

// Analytics (non-interactive events)
browser.runtime.onInstalled.addListener(() => {
});
browser.runtime.onStartup.addListener(() => {
});

// If the URL changes, try again to highlight
// This is done to support javascript Single-page applications
// which often change the URL without reloading the page
browser.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
    if (changeInfo.url) {
        browser.scripting.executeScript({
            target: { tabId, allFrames: true },
            files: ['src/contentScripts/loadHighlights.js'],
        });
    }
});

// Add Keyboard shortcuts
browser.commands.onCommand.addListener((command) => {
    switch (command) {
        case 'execute-highlight':
            highlightText();
            toggleHighlighterCursor();
            break;
    }
});

// Listen to messages from content scripts
/* eslint-disable consistent-return */
browser.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (!request.action) return;

    switch (request.action) {
        case 'highlight':
            highlightText();
            return;
        case 'track-event':
            return;
        case 'remove-highlights':
            removeHighlights();
            return;
        case 'remove-highlight':
            removeHighlight(request.highlightId);
            return;
        case 'change-color':
            changeColor(request.color);
            return;
        case 'edit-color':
            editColor(request.colorTitle, request.color, request.textColor);
            return;
        case 'toggle-highlighter-cursor':
            toggleHighlighterCursor();
            return;
        case 'get-highlights':
            wrapResponse(getHighlights(), sendResponse);
            return true; // return asynchronously
        case 'get-lost-highlights':
            wrapResponse(getLostHighlights(), sendResponse);
            return true; // return asynchronously
        case 'show-highlight':
            return showHighlight(request.highlightId);
        case 'get-current-color':
            wrapResponse(getCurrentColor(), sendResponse);
            return true; // return asynchronously
        case 'get-color-options':
            wrapResponse(getColorOptions(), sendResponse);
            return true; // return asynchronously
    }
});
/* eslint-enable consistent-return */

async function getCurrentColor() {
    const { color } = await browser.storage.sync.get("color");
    const colorTitle = color || DEFAULT_COLOR_TITLE;
    const colorOptions = await getColorOptions();
    return colorOptions.find((colorOption) => colorOption.title === colorTitle) || colorOptions[0];
}

function highlightTextFromContext() {
    highlightText();
}

function toggleHighlighterCursorFromContext() {
    toggleHighlighterCursor();
}

function changeColorFromContext(menuItemId) {
    changeColor(menuItemId);
}

function highlightText() {
    executeInCurrentTab({ file: 'src/contentScripts/highlight.js' });
}

function toggleHighlighterCursor() {
    executeInCurrentTab({ file: 'src/contentScripts/toggleHighlighterCursor.js' });
}

function removeHighlights() {
    executeInCurrentTab({ file: 'src/contentScripts/removeHighlights.js' });
}

function removeHighlight(highlightId) {

    function contentScriptRemoveHighlight(highlightIndex) {
        const highlightError = window.highlighter_lostHighlights.get(highlightIndex);
        clearTimeout(highlightError?.timeout);
        window.highlighter_lostHighlights.delete(highlightIndex);
        removeHighlight(highlightIndex, window.location.hostname + window.location.pathname, window.location.pathname);
    }

    executeInCurrentTab({ func: contentScriptRemoveHighlight, args: [highlightId] });
}

function showHighlight(highlightId) {
    console.log("hihi ruka chan")
    function contentScriptShowHighlight(highlightId) { // eslint-disable-line no-shadow
        const highlightEl = document.querySelector(`[data-highlight-id="${highlightId}"]`);
        if (highlightEl) {
            highlightEl.scrollIntoViewIfNeeded(true);
            const boundingRect = highlightEl.getBoundingClientRect();
            onHighlightMouseEnterOrClick({
                'type': 'click',
                'target': highlightEl,
                'clientX': boundingRect.left + (boundingRect.width / 2),
            });
        }
    }

    executeInCurrentTab({ func: contentScriptShowHighlight, args: [highlightId] });
}

function getHighlights() {
    return executeInCurrentTab({ file: 'src/contentScripts/getHighlights.js' });
}

function getLostHighlights() {
    function contentScriptGetLostHighlights() {
        const lostHighlights = [];
        window.highlighter_lostHighlights.forEach((highlight, index) => lostHighlights.push({ string: highlight?.string, index }));
        return lostHighlights;
    }

    return executeInCurrentTab({ func: contentScriptGetLostHighlights });
}

function changeColor(colorTitle) {
    if (!colorTitle) return;

    browser.storage.sync.set({ color: colorTitle });

    // Also update the context menu
    browser.contextMenus.update(colorTitle, { checked: true });
}

async function editColor(colorTitle, color, textColor) {

    const colorOptions = await getColorOptions();
    const colorOption = colorOptions.find((option) => option.title === colorTitle);
    colorOption.color = color;
    colorOption.textColor = textColor;

    if (!textColor) {
        delete colorOption.textColor;
    }

    browser.storage.sync.set({ colors: colorOptions });
}

function getColorOptions() {
    return new Promise((resolve, _reject) => {
        browser.storage.sync.get({
            colors: [ // Default value
                {
                    title: 'yellow',
                    color: 'rgb(255, 255, 102)',
                },
                {
                    title: 'green',
                    color: 'rgb(153, 255, 102)',
                },
                {
                    title: 'blue',
                    color: 'rgb(51, 204, 204)',
                },
                {
                    title: 'pink',
                    color: 'rgb(255, 153, 204)',
                },
                {
                    title: 'dark',
                    color: 'rgb(52, 73, 94)',
                    textColor: 'rgb(255, 255, 255)',
                },
            ],
        }, ({ colors }) => resolve(colors));
    });
}
