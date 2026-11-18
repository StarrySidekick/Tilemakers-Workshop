# Where the pictures come from

- **`table-oak.jpg`**, Starà's table: "Oak Wood Planks" by Dimitrios Savva,
  from Poly Haven (https://polyhaven.com/a/oak_wood_planks), CC0 (public
  domain, no attribution required; credited anyway). The 2K diffuse map,
  re-saved as a 2048 px JPEG at quality 70. It is a photograph of real oak
  and tiles seamlessly. The texture covers 1.2 m of table, which is how
  `src/render.js` draws it to scale: a Carcassonne tile is 45 mm, so one
  repeat of the wood spans about 27 tiles.
- **`fonts/`**, Starà's type, all under the SIL Open Font License 1.1 (the
  licence for each is beside it):
  - `im-fell-english*.woff2`: IM Fell English, roman, italic and small caps,
    by Igino Marini, after the Fell types. Subset to Latin-1 and converted to
    WOFF2 (it has no Reserved Font Name, so that is allowed).
  - `UnifrakturMaguntia-Book.ttf`: UnifrakturMaguntia by j. 'mach' wust,
    after Peter Wiegel. Shipped untouched: it has a Reserved Font Name, and
    under the OFL a subset or converted copy would be a modified version.
  - `cinzel.woff2`: Cinzel, by the Cinzel Project Authors. Subset to Latin-1
    and converted to WOFF2 (no Reserved Font Name). Used for numbers.
  All from the google/fonts repository.
- **`paper.png`** is synthesised, not photographed: `tools/paper.py`.
