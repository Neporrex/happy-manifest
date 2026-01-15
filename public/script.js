document.addEventListener('DOMContentLoaded', () => {
    const appIdInput = document.getElementById('app-id');
    const depotSection = document.getElementById('depot-section');
    const depotSelect = document.getElementById('depot-select');
    const manifestSection = document.getElementById('manifest-section');
    const generateBtn = document.getElementById('generate-btn');
    const manifestIdInput = document.getElementById('manifest-id');

    let debounceTimer;

    appIdInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const appId = e.target.value.trim();
        if (!appId) {
            hideSections();
            return;
        }

        debounceTimer = setTimeout(() => fetchDepots(appId), 500);
    });

    async function fetchDepots(appId) {
        const loadingIndicator = document.getElementById('loading-depots');
        if (loadingIndicator) loadingIndicator.classList.remove('hidden');
        
        try {
            const response = await fetch(`/api/depots/${appId}`);
            if (!response.ok) throw new Error('Failed to fetch depots');
            
            const depots = await response.json();
            if (depots.length === 0) throw new Error('No depots found');

            depotSelect.innerHTML = '<option value="">Choose a depot...</option>' + 
                depots.map(d => `<option value="${d.id}">[${d.id}] ${d.name}</option>`).join('');
            
            depotSection.classList.remove('hidden');
            manifestSection.classList.remove('hidden');
            generateBtn.disabled = true;
        } catch (err) {
            console.error(err);
            hideSections();
        } finally {
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
        }
    }

    depotSelect.addEventListener('change', () => {
        generateBtn.disabled = !depotSelect.value;
    });

    generateBtn.addEventListener('click', async () => {
        const appId = appIdInput.value.trim();
        const depotId = depotSelect.value;
        const manifestId = manifestIdInput.value.trim();

        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span>Generating...</span>';

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ appId, depotId, manifestId })
            });

            if (!response.ok) throw new Error('Generation failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `manifest_${appId}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            alert('Failed to generate manifest: ' + err.message);
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<span>Generate & Download</span>';
        }
    });

    function hideSections() {
        depotSection.classList.add('hidden');
        manifestSection.classList.add('hidden');
        generateBtn.disabled = true;
    }

    // Check auth status
    fetch('/api/user').then(r => r.json()).then(user => {
        if (user) {
            document.getElementById('user-info').classList.remove('hidden');
            document.getElementById('user-name').textContent = user.username;
            document.getElementById('user-avatar').src = `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png`;
        } else if (window.location.pathname.includes('generator.html')) {
            window.location.href = 'index.html';
        }
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        fetch('/auth/logout', { method: 'POST' }).then(() => window.location.href = 'index.html');
    });
});
