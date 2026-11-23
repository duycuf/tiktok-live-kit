// Theme-specific code. Most themes never need to edit this file: everything is declared in theme.json + scene.json.
// Use it for an action or a drawing layer the engine does not provide yet.
//
//   Kit.action('tenHam', (person, ev, ctx) => { ... })   called from theme.json: { "js": "tenHam" }
//   Kit.on('frame', (t, dt) => { ... })                  runs every frame
//   Kit.on('gift', (ev) => { ... })                      listens for events: join chat like gift command follow share title goal periodic speak seated
//
// Built-in tools: Kit.scene (people, points, camera), Kit.fx (effects), Kit.audio (sound), Kit.hud (interface), Kit.assets (images, gifs, videos)

// Example: sprinkle extra stars around the head of someone who sends a big gift
// Kit.action('rac-sao', (person) => {
//   const h = Kit.scene.P.head(person);
//   Kit.fx.emit('star', { x: h.x, y: h.y, count: 20, spread: 40 });
// });
