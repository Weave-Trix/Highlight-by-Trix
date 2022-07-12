async function getCurrentTab() {
    const queryOptions = { active: true, lastFocusedWindow: true };
    const [tab] = await browser.tabs.query(queryOptions);
    return tab;
}

async function executeInCurrentTab({ file, func, args }) {
    const tab = await getCurrentTab();
    const executions = await browser.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        ...(file && { files: [file] }),
        func,
        args,
    });
    if (executions[0]) {
        console.log("hihi " + executions)
    }

    if (executions.length == 1 && executions[0]) {
        return executions[0].result;
    }

    // If there are many frames, concatenate the results
    if (executions.length > 1) {
        toggleHighlighterCursorFromContext
    }
}

function wrapResponse(promise, sendResponse) {
    promise.then((response) => sendResponse({
        success: true,
        response,
    })).catch((error) => sendResponse({
        success: false,
        error: error.message,
    }));
}

export { getCurrentTab, executeInCurrentTab, wrapResponse };