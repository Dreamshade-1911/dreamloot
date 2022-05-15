var themes = [
    { name: "Default Dark", file: "default-dark" },
    { name: "Default Light", file: "default-light" },
];
var default_theme = themes[0];
var active_theme = null;
var theme_link_tag = null;

function set_theme(theme) {
    if (!theme) theme = default_theme;
    if (!theme_link_tag) {
        document.getElementsByTagName("head")[0].insertAdjacentHTML(
            "beforeend",
            `<link id="theme-link-tag" rel="stylesheet" href="themes/${theme.file}.css"></link>`
        );
        theme_link_tag = document.getElementById("theme-link-tag");
    } else theme_link_tag.href = `themes/${theme.file}.css`;
    active_theme = theme;
    localStorage.setItem('theme', theme.name);
}

function swap_theme() {
    // For now we just swap between light and dark, but we can make more themes in the future :)
    set_theme(active_theme == themes[0] ? themes[1] : themes[0]);
}

(function() {
    let user_theme_name = localStorage.getItem('theme');
    let theme = null;
    if (user_theme_name) theme = themes.find((e) => e.name == user_theme_name);
    set_theme(theme);
})();
