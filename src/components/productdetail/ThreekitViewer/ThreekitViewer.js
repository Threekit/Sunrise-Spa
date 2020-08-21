function loadThreekitScript() {
  return new Promise((resolve) => {
    const existingScript = document.getElementById('threekit-library');

    if (existingScript) resolve();
    else {
      const script = document.createElement('script');
      const environment = process.env.VUE_APP_CT_TK_Environment || 'preview';
      script.id = 'threekit-library';
      script.src = `https://${environment}.threekit.com/app/js/threekit-player.js`;
      document.body.appendChild(script);
      script.onload = () => resolve();
    }
  });
}

export default {
  props: {
    threekitId: {
      type: String,
      required: true,
    },
  },
  mounted() {
    loadThreekitScript().then(async () => {
      window.player = await window.threekitPlayer({
        assetId: this.threekitId,
        authToken: process.env.VUE_APP_CT_TK_AUTH_TOKEN,
        el: document.getElementById('threekit-viewer'),
        orgId: process.env.VUE_APP_CT_TK_ORG_ID,
      });
    });
  },
};
