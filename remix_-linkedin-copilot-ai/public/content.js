/**
 * LinkedIn Executive Copilot - Content Script
 * This script runs on LinkedIn pages and injects the AI assistant buttons.
 */

console.log('LinkedIn Executive Copilot: Content script loaded.');

let lastClickedCommentBox = null;

// Function to extract profile data
function extractProfileData() {
  const name = document.querySelector('.text-heading-xlarge')?.innerText || 
               document.querySelector('.pv-top-card--list li:first-child')?.innerText;
  const headline = document.querySelector('.text-body-medium.break-words')?.innerText ||
                   document.querySelector('.pv-top-card--list-bullet li:first-child')?.innerText;
  const profileImageUrl = document.querySelector('.pv-top-card-profile-picture__image--show')?.src ||
                          document.querySelector('.profile-photo-edit__preview')?.src;
  
  return {
    name: name?.trim(),
    headline: headline?.trim(),
    profileImageUrl,
    linkedInUrl: window.location.href.split('?')[0]
  };
}

// Function to inject "Add to Copilot" button on profile pages
function injectProfileButton() {
  if (!window.location.href.includes('/in/')) return;
  if (document.getElementById('copilot-profile-btn')) return;

  const actionsContainer = document.querySelector('.pv-top-card-v2-ctas') || 
                           document.querySelector('.pvs-profile-actions');
  
  if (actionsContainer) {
    const btn = document.createElement('button');
    btn.id = 'copilot-profile-btn';
    btn.innerHTML = '✨ Tilføj til Copilot';
    btn.className = 'artdeco-button artdeco-button--2 artdeco-button--primary ember-view ml2';
    btn.style.backgroundColor = '#18181b';
    btn.style.color = 'white';
    btn.style.borderRadius = '12px';
    btn.style.fontWeight = 'bold';
    btn.style.marginLeft = '8px';
    
    btn.onclick = () => {
      const data = extractProfileData();
      chrome.runtime.sendMessage({
        type: 'ADD_THOUGHT_LEADER',
        data: data
      });
      btn.innerHTML = '✅ Tilføjet!';
      btn.disabled = true;
    };
    
    actionsContainer.appendChild(btn);
  }
}

// Function to inject the AI button into LinkedIn comment boxes
function injectAIButton() {
  // LinkedIn uses specific classes for their comment boxes
  const commentBoxes = document.querySelectorAll('.comments-comment-box__form-container');
  
  commentBoxes.forEach(box => {
    if (box.querySelector('.executive-copilot-btn')) return; // Already injected

    const btn = document.createElement('button');
    btn.className = 'executive-copilot-btn';
    btn.innerHTML = '✨';
    btn.title = 'Generer Executive Kommentar';
    btn.style.cssText = `
      position: absolute;
      right: 10px;
      bottom: 10px;
      background: #000;
      color: #fff;
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      cursor: pointer;
      z-index: 100;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      lastClickedCommentBox = box;
      
      const postContainer = box.closest('.feed-shared-update-v2, .occludable-update, .feed-shared-update, .update-components-update-v2');
      let postText = '';
      
      if (postContainer) {
        const textElement = postContainer.querySelector('.feed-shared-update-v2__description, .feed-shared-text, .update-components-text, .break-words');
        postText = textElement ? textElement.innerText : '';
      }

      chrome.runtime.sendMessage({
        type: 'LINKEDIN_POST_TEXT',
        text: postText
      });
      
      chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    };

    box.style.position = 'relative';
    box.appendChild(btn);
  });
}

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'INSERT_COMMENT' && message.text) {
    const target = lastClickedCommentBox || 
                   document.activeElement.closest('.comments-comment-box__form-container')?.querySelector('.ql-editor') ||
                   document.querySelector('.ql-editor[contenteditable="true"]');

    if (target) {
      // For LinkedIn's Quill editor (contenteditable)
      if (target.getAttribute('contenteditable') === 'true') {
        target.innerHTML = `<p>${message.text.replace(/\n/g, '</p><p>')}</p>`;
      } else {
        // For standard textareas
        target.value = message.text;
      }

      // Trigger input events so LinkedIn's React code notices the change
      const event = new Event('input', { bubbles: true });
      target.dispatchEvent(event);
      
      // Focus the element
      target.focus();
    }
  }
});

// Function to inject "Rewrite" button on posts
function injectRewriteButton() {
  const posts = document.querySelectorAll('.feed-shared-update-v2, .occludable-update, .update-components-update-v2');
  
  posts.forEach(post => {
    const actions = post.querySelector('.feed-shared-update-v2__control-menu, .update-components-control-menu');
    if (!actions || post.querySelector('.rewrite-copilot-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'rewrite-copilot-btn';
    btn.innerHTML = '✍️ Rewrite';
    btn.style.cssText = `
      margin-right: 12px;
      font-size: 12px;
      font-weight: bold;
      color: #666;
      background: none;
      border: none;
      cursor: pointer;
    `;

    btn.onclick = (e) => {
      e.preventDefault();
      const textElement = post.querySelector('.feed-shared-update-v2__description, .update-components-text, .feed-shared-text, .break-words');
      const postText = textElement ? textElement.innerText : '';
      
      chrome.runtime.sendMessage({
        type: 'LINKEDIN_REWRITE_POST',
        text: postText
      });
      
      chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    };

    const actionBar = post.querySelector('.feed-shared-update-v2__action-bar, .update-v2-social-action-bar');
    if (actionBar) {
      actionBar.prepend(btn);
    }
  });
}

// Initial injection
injectAIButton();
injectProfileButton();
injectRewriteButton();

const observer = new MutationObserver((mutations) => {
  injectAIButton();
  injectProfileButton();
  injectRewriteButton();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
