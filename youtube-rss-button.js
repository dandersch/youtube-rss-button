// ==UserScript==
// @name         youtube-rss-button
// @version      1.0
// @description  Adds an RSS button next to the "Subscribe" button on YouTube videos
// @author       dandersch
// @match        https://www.youtube.com/watch*
// @grant        GM_xmlhttpRequest
// ==/UserScript==


// TODO:
// - stylize button
// - check if already subscribe and add unsubscribe button in that case
// - add feed to a specified category (not part of google reader api, though...)

(function() {
    'use strict';

    function getChannelId(channelUrl) {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://www.youtube.com/@${channelUrl}`,
            onload: function(response) {
                if (response.status === 200) {
                    const data = response.responseText;

                    // Use a regular expression to find the channel_id
                    const regex = /channel_id=([a-zA-Z0-9_-]+)/;
                    const match = data.match(regex);

                    if (match && match[1]) {
                        const channelId = match[1];
                        console.log(`Channel ID: ${channelId}`);

                        // add rss button TODO move this out of here
                        const subscribeButton = document.querySelector('ytd-subscribe-button-renderer');
                        if (!document.getElementById('rss-button')) {
                            const rssButton = createRssButton(channelId);
                            subscribeButton.parentNode.insertBefore(rssButton, subscribeButton.nextSibling);
                        }
                    } else {
                        console.log('Channel ID not found');
                    }
                } else {
                    console.error('Error fetching channel page:', response.statusText);
                }
            },
            onerror: function(err) {
                console.error('Error fetching channel page:', err);
            }
        });
    }

    // create RSS button next to the 'Subscribe' button
    function createRssButton(channelId) {

        // TODO stylize
        const button = document.createElement('button');
        button.innerText             = 'RSS';
        button.style.marginLeft      = '10px';
        button.style.padding         = '5px 10px';
        button.style.backgroundColor = '#FF0000';
        button.style.color           = '#FFFFFF';
        button.style.border          = 'none';
        button.style.borderRadius    = '5px';
        button.style.cursor          = 'pointer';
        button.id                    = 'rss-button';

        const rssUrl    = `https://www.youtube.com/feeds/videos.xml?channel_id=`;

        // set by user
        const apiUrl    = 'https://your-rss-reader.com/api/greader.php';
        const username  = 'user';
        const apiPasswd = 'password';

        var sid; // google reader user api token

        // get session id
        GM_xmlhttpRequest({
            method: 'POST',
            url: `${apiUrl}/accounts/ClientLogin`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: `Email=${encodeURIComponent(username)}&Passwd=${encodeURIComponent(apiPasswd)}`,
            onload: function(response) {
                const text = response.responseText;
                const sidMatch = text.match(/SID=(.+)/);
                if (sidMatch) {
                    sid = sidMatch[1];
                    console.log('Session ID:', sid);
                } else {
                    alert('Failed to login to RSS server: ' + response.statusText);
                }
            }
        });

        button.onclick = function() {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${apiUrl}/reader/api/0/subscription/edit`,
                headers: {
                    'Authorization': `GoogleLogin auth=${sid}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                data: `ac=subscribe&s=feed/${rssUrl}${channelId}`,
                onload: function(response) {
                  console.log('Using SID:', sid);
                  if (response.status === 200) {
                      alert('Successfully subscribed to feed');
                  } else {
                      alert('Failed to subscribe:' + response.statusText);
                  }
                },
               onerror: function(error) {
                   alert('Failed to subscribe:' + error);
              }
            });
        };

        return button;
    }

    function addRSSButton() {
        const channelName = document.querySelector('.ytd-channel-name a.yt-simple-endpoint.style-scope.yt-formatted-string').getAttribute('href').split('/@')[1];

        if (channelName) {
            getChannelId(channelName);
        }
    }

    const observer = new MutationObserver((mutationsList, observer) => {
        if (document.querySelector('a.yt-simple-endpoint.style-scope.yt-formatted-string')) {
            addRSSButton();
            observer.disconnect();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
