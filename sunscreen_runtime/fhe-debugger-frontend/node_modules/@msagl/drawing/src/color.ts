export type TextMeasurerOptions = {
  fontFamily: string
  fontSize: number
  lineHeight: number
  fontStyle: 'normal' | 'italic' | 'oblique'
  fontWeight: 'normal' | 'bold' | 'lighter' | 'bolder' | number
}
export class Color {
  private static mkWithKeyword(a: number, r: number, g: number, b: number, keyword: string): Color {
    const ret = new Color(a, r, g, b)
    ret.keyword = keyword
    return ret
  }
  static parse(keyword: string): Color | undefined {
    switch (keyword.toLowerCase()) {
      case 'aliceblue':
        return Color.AliceBlue
      case 'antiquewhite':
        return Color.AntiqueWhite
      case 'aqua':
        return Color.Aqua
      case 'aquamarine':
        return Color.Aquamarine
      case 'azure':
        return Color.Azure
      case 'beige':
        return Color.Beige
      case 'bisque':
        return Color.Bisque
      case 'black':
        return Color.Black
      case 'blanchedalmond':
        return Color.BlanchedAlmond
      case 'blue':
        return Color.Blue
      case 'blueviolet':
        return Color.BlueViolet
      case 'brown':
        return Color.Brown
      case 'burlywood':
        return Color.BurlyWood
      case 'cadetblue':
        return Color.CadetBlue
      case 'chartreuse':
        return Color.Chartreuse
      case 'chocolate':
        return Color.Chocolate
      case 'coral':
        return Color.Coral
      case 'cornflowerblue':
        return Color.CornflowerBlue
      case 'cornsilk':
        return Color.Cornsilk
      case 'crimson':
        return Color.Crimson
      case 'cyan':
        return Color.Cyan
      case 'darkblue':
        return Color.DarkBlue
      case 'darkcyan':
        return Color.DarkCyan
      case 'darkgoldenrod':
        return Color.DarkGoldenrod
      case 'darkgray':
        return Color.DarkGray
      case 'darkgreen':
        return Color.DarkGreen
      case 'darkkhaki':
        return Color.DarkKhaki
      case 'darkmagenta':
        return Color.DarkMagenta
      case 'darkolivegreen':
        return Color.DarkOliveGreen
      case 'darkorange':
        return Color.DarkOrange
      case 'darkorchid':
        return Color.DarkOrchid
      case 'darkred':
        return Color.DarkRed
      case 'darksalmon':
        return Color.DarkSalmon
      case 'darkseagreen':
        return Color.DarkSeaGreen
      case 'darkslateblue':
        return Color.DarkSlateBlue
      case 'darkslategray':
        return Color.DarkSlateGray
      case 'darkturquoise':
        return Color.DarkTurquoise
      case 'darkviolet':
        return Color.DarkViolet
      case 'deeppink':
        return Color.DeepPink
      case 'deepskyblue':
        return Color.DeepSkyBlue
      case 'dimgray':
        return Color.DimGray
      case 'dodgerblue':
        return Color.DodgerBlue
      case 'firebrick':
        return Color.Firebrick
      case 'floralwhite':
        return Color.FloralWhite
      case 'forestgreen':
        return Color.ForestGreen
      case 'fuchsia':
        return Color.Fuchsia
      case 'gainsboro':
        return Color.Gainsboro
      case 'ghostwhite':
        return Color.GhostWhite
      case 'gold':
        return Color.Gold
      case 'goldenrod':
        return Color.Goldenrod
      case 'gray':
        return Color.Gray
      case 'green':
        return Color.Green
      case 'greenyellow':
        return Color.GreenYellow
      case 'honeydew':
        return Color.Honeydew
      case 'hotpink':
        return Color.HotPink
      case 'indianred':
        return Color.IndianRed
      case 'indigo':
        return Color.Indigo
      case 'ivory':
        return Color.Ivory
      case 'khaki':
        return Color.Khaki
      case 'lavender':
        return Color.Lavender
      case 'lavenderblush':
        return Color.LavenderBlush
      case 'lawngreen':
        return Color.LawnGreen
      case 'lemonchiffon':
        return Color.LemonChiffon
      case 'lightblue':
        return Color.LightBlue
      case 'lightcoral':
        return Color.LightCoral
      case 'lightcyan':
        return Color.LightCyan
      case 'lightgoldenrodyellow':
        return Color.LightGoldenrodYellow
      case 'lightgray':
      case 'lightgrey':
        return Color.LightGray
      case 'lightgreen':
        return Color.LightGreen
      case 'lightpink':
        return Color.LightPink
      case 'lightsalmon':
        return Color.LightSalmon
      case 'lightseagreen':
        return Color.LightSeaGreen
      case 'lightskyblue':
        return Color.LightSkyBlue
      case 'lightslategray':
        return Color.LightSlateGray
      case 'lightsteelblue':
        return Color.LightSteelBlue
      case 'lightyellow':
        return Color.LightYellow
      case 'lime':
        return Color.Lime
      case 'limegreen':
        return Color.LimeGreen
      case 'linen':
        return Color.Linen
      case 'magenta':
        return Color.Magenta
      case 'maroon':
        return Color.Maroon
      case 'mediumaquamarine':
        return Color.MediumAquamarine
      case 'mediumblue':
        return Color.MediumBlue
      case 'mediumorchid':
        return Color.MediumOrchid
      case 'mediumpurple':
        return Color.MediumPurple
      case 'mediumseagreen':
        return Color.MediumSeaGreen
      case 'mediumslateblue':
        return Color.MediumSlateBlue
      case 'mediumspringgreen':
        return Color.MediumSpringGreen
      case 'mediumturquoise':
        return Color.MediumTurquoise
      case 'mediumvioletred':
        return Color.MediumVioletRed
      case 'midnightblue':
        return Color.MidnightBlue
      case 'mintcream':
        return Color.MintCream
      case 'mistyrose':
        return Color.MistyRose
      case 'moccasin':
        return Color.Moccasin
      case 'navajowhite':
        return Color.NavajoWhite
      case 'navy':
        return Color.Navy
      case 'oldlace':
        return Color.OldLace
      case 'olive':
        return Color.Olive
      case 'olivedrab':
        return Color.OliveDrab
      case 'orange':
        return Color.Orange
      case 'orangered':
        return Color.OrangeRed
      case 'orchid':
        return Color.Orchid
      case 'palegoldenrod':
        return Color.PaleGoldenrod
      case 'palegreen':
        return Color.PaleGreen
      case 'paleturquoise':
        return Color.PaleTurquoise
      case 'palevioletred':
        return Color.PaleVioletRed
      case 'papayawhip':
        return Color.PapayaWhip
      case 'peachpuff':
        return Color.PeachPuff
      case 'peru':
        return Color.Peru
      case 'pink':
        return Color.Pink
      case 'plum':
        return Color.Plum
      case 'powderblue':
        return Color.PowderBlue
      case 'purple':
        return Color.Purple
      case 'red':
        return Color.Red
      case 'rosybrown':
        return Color.RosyBrown
      case 'royalblue':
        return Color.RoyalBlue
      case 'saddlebrown':
        return Color.SaddleBrown
      case 'salmon':
        return Color.Salmon
      case 'sandybrown':
        return Color.SandyBrown
      case 'seagreen':
        return Color.SeaGreen
      case 'seashell':
        return Color.SeaShell
      case 'sienna':
        return Color.Sienna
      case 'silver':
        return Color.Silver
      case 'skyblue':
        return Color.SkyBlue
      case 'slateblue':
        return Color.SlateBlue
      case 'slategray':
        return Color.SlateGray
      case 'snow':
        return Color.Snow
      case 'springgreen':
        return Color.SpringGreen
      case 'steelblue':
        return Color.SteelBlue
      case 'tan':
        return Color.Tan
      case 'teal':
        return Color.Teal
      case 'thistle':
        return Color.Thistle
      case 'tomato':
        return Color.Tomato
      case 'transparent':
        return Color.Transparent
      case 'turquoise':
        return Color.Turquoise
      case 'violet':
        return Color.Violet
      case 'wheat':
        return Color.Wheat
      case 'white':
        return Color.White
      case 'whitesmoke':
        return Color.WhiteSmoke
      case 'yellow':
        return Color.Yellow
      case 'yellowgreen':
        return Color.YellowGreen
      default:
        return undefined
    }
  }

  private keyword_: string
  public get keyword(): string {
    return this.keyword_
  }
  public set keyword(value: string) {
    this.keyword_ = value
  }

  private a: number

  // constructor with alpha and red, green, bluee components
  constructor(a: number, r: number, g: number, b: number) {
    this.a = a
    this.r = r
    this.g = g
    this.b = b
  }

  // opaque color

  static mkRGB(r: number, g: number, b: number): Color {
    return new Color(255, r, g, b)
  }

  /**  The color opaqueness: changes from 0 to 255 */

  get A(): number {
    return this.a
  }

  set A(value: number) {
    this.a = value
  }

  r: number

  /** The red component: changes form 0 to 255 */

  get R(): number {
    return this.r
  }
  /** The red component: changes form 0 to 255 */

  set R(value: number) {
    this.r = value
  }

  g: number

  /** The green component: changes form 0 to 255 */

  get G(): number {
    return this.g
  }
  /** The red component: changes form 0 to 255 */

  set G(value: number) {
    this.g = value
  }

  b: number

  /** The blue component: changes form 0 to 255 */

  get B(): number {
    return this.b
  }
  /** The blue component: changes form 0 to 255 */
  set B(value: number) {
    this.b = value
  }

  static Xex(i: number): string {
    const s = i.toString(16)
    if (s.length === 1) {
      return '0' + s
    }

    return s.substring(s.length - 2, 2)
  }

  static equal(a: Color, b: Color): boolean {
    return a.a === b.a && a.r === b.r && a.b === b.b && a.g === b.g
  }

  // !=

  toString(): string {
    return this.keyword
      ? this.keyword
      : '"#' + Color.Xex(this.R) + Color.Xex(this.G) + Color.Xex(this.B) + (this.A === 255 ? '' : Color.Xex(this.A)) + '"'
  }

  //

  static get AliceBlue(): Color {
    return Color.mkWithKeyword(255, 240, 248, 255, 'aliceblue')
  }

  //

  static get AntiqueWhite(): Color {
    return Color.mkWithKeyword(255, 250, 235, 215, 'antiquewhite')
  }

  //

  static get Aqua(): Color {
    return Color.mkWithKeyword(255, 0, 255, 255, 'aqua')
  }

  //

  static get Aquamarine(): Color {
    return Color.mkWithKeyword(255, 127, 255, 212, 'aquamarine')
  }

  //

  static get Azure(): Color {
    return Color.mkWithKeyword(255, 240, 255, 255, 'azure')
  }

  //

  static get Beige(): Color {
    return Color.mkWithKeyword(255, 245, 245, 220, 'beige')
  }

  //

  static get Bisque(): Color {
    return Color.mkWithKeyword(255, 255, 228, 196, 'bisque')
  }

  //

  static get Black(): Color {
    return Color.mkWithKeyword(255, 0, 0, 0, 'black')
  }

  //

  static get BlanchedAlmond(): Color {
    return Color.mkWithKeyword(255, 255, 235, 205, 'blanchedalmond')
  }

  //

  static get Blue(): Color {
    return Color.mkWithKeyword(255, 0, 0, 255, 'blue')
  }

  //

  static get BlueViolet(): Color {
    return Color.mkWithKeyword(255, 138, 43, 226, 'blueviolet')
  }

  //

  static get Brown(): Color {
    return Color.mkWithKeyword(255, 165, 42, 42, 'brown')
  }

  //

  static get BurlyWood(): Color {
    return Color.mkWithKeyword(255, 222, 184, 135, 'burlywood')
  }

  //

  static get CadetBlue(): Color {
    return Color.mkWithKeyword(255, 95, 158, 160, 'cadetblue')
  }

  //

  static get Chartreuse(): Color {
    return Color.mkWithKeyword(255, 127, 255, 0, 'chartreuse')
  }

  //

  static get Chocolate(): Color {
    return Color.mkWithKeyword(255, 210, 105, 30, 'chocolate')
  }

  //

  static get Coral(): Color {
    return Color.mkWithKeyword(255, 255, 127, 80, 'coral')
  }

  //

  static get CornflowerBlue(): Color {
    return Color.mkWithKeyword(255, 100, 149, 237, 'cornflowerblue')
  }

  //

  static get Cornsilk(): Color {
    return Color.mkWithKeyword(255, 255, 248, 220, 'cornsilk')
  }

  //

  static get Crimson(): Color {
    return Color.mkWithKeyword(255, 220, 20, 60, 'crimson')
  }

  //

  static get Cyan(): Color {
    return Color.mkWithKeyword(255, 0, 255, 255, 'cyan')
  }

  //

  static get DarkBlue(): Color {
    return Color.mkWithKeyword(255, 0, 0, 139, 'darkblue')
  }

  //

  static get DarkCyan(): Color {
    return Color.mkWithKeyword(255, 0, 139, 139, 'darkcyan')
  }

  //

  static get DarkGoldenrod(): Color {
    return Color.mkWithKeyword(255, 184, 134, 11, 'darkgoldenrod')
  }

  //

  static get DarkGray(): Color {
    return Color.mkWithKeyword(255, 169, 169, 169, 'darkgray')
  }

  //

  static get DarkGreen(): Color {
    return Color.mkWithKeyword(255, 0, 100, 0, 'darkgreen')
  }

  //

  static get DarkKhaki(): Color {
    return Color.mkWithKeyword(255, 189, 183, 107, 'darkkhaki')
  }

  //

  static get DarkMagenta(): Color {
    return Color.mkWithKeyword(255, 139, 0, 139, 'darkmagenta')
  }

  //

  static get DarkOliveGreen(): Color {
    return Color.mkWithKeyword(255, 85, 107, 47, 'darkolivegreen')
  }

  //

  static get DarkOrange(): Color {
    return Color.mkWithKeyword(255, 255, 140, 0, 'darkorange')
  }

  //

  static get DarkOrchid(): Color {
    return Color.mkWithKeyword(255, 153, 50, 204, 'darkorchid')
  }

  //

  static get DarkRed(): Color {
    return Color.mkWithKeyword(255, 139, 0, 0, 'darkred')
  }

  //

  static get DarkSalmon(): Color {
    return Color.mkWithKeyword(255, 233, 150, 122, 'darksalmon')
  }

  //

  static get DarkSeaGreen(): Color {
    return Color.mkWithKeyword(255, 143, 188, 139, 'darkseagreen')
  }

  //

  static get DarkSlateBlue(): Color {
    return Color.mkWithKeyword(255, 72, 61, 139, 'darkslateblue')
  }

  //

  static get DarkSlateGray(): Color {
    return Color.mkWithKeyword(255, 47, 79, 79, 'darkslategray')
  }

  //

  static get DarkTurquoise(): Color {
    return Color.mkWithKeyword(255, 0, 206, 209, 'darkturquoise')
  }

  //

  static get DarkViolet(): Color {
    return Color.mkWithKeyword(255, 148, 0, 211, 'darkviolet')
  }

  //

  static get DeepPink(): Color {
    return Color.mkWithKeyword(255, 255, 20, 147, 'deeppink')
  }

  //

  static get DeepSkyBlue(): Color {
    return Color.mkWithKeyword(255, 0, 191, 255, 'deepskyblue')
  }

  //

  static get DimGray(): Color {
    return Color.mkWithKeyword(255, 105, 105, 105, 'dimgray')
  }

  //

  static get DodgerBlue(): Color {
    return Color.mkWithKeyword(255, 30, 144, 255, 'dodgerblue')
  }

  //

  static get Firebrick(): Color {
    return Color.mkWithKeyword(255, 178, 34, 34, 'firebrick')
  }

  //

  static get FloralWhite(): Color {
    return Color.mkWithKeyword(255, 255, 250, 240, 'floralwhite')
  }

  //

  static get ForestGreen(): Color {
    return Color.mkWithKeyword(255, 34, 139, 34, 'forestgreen')
  }

  //

  static get Fuchsia(): Color {
    return Color.mkWithKeyword(255, 255, 0, 255, 'fuchsia')
  }

  //

  static get Gainsboro(): Color {
    return Color.mkWithKeyword(255, 220, 220, 220, 'gainsboro')
  }

  //

  static get GhostWhite(): Color {
    return Color.mkWithKeyword(255, 248, 248, 255, 'ghostwhite')
  }

  //

  static get Gold(): Color {
    return Color.mkWithKeyword(255, 255, 215, 0, 'gold')
  }

  //

  static get Goldenrod(): Color {
    return Color.mkWithKeyword(255, 218, 165, 32, 'goldenrod')
  }

  //

  static get Gray(): Color {
    return Color.mkWithKeyword(255, 128, 128, 128, 'gray')
  }

  //

  static get Green(): Color {
    return Color.mkWithKeyword(255, 0, 128, 0, 'green')
  }

  //

  static get GreenYellow(): Color {
    return Color.mkWithKeyword(255, 173, 255, 47, 'greenyellow')
  }

  //

  static get Honeydew(): Color {
    return Color.mkWithKeyword(255, 240, 255, 240, 'honeydew')
  }

  //

  static get HotPink(): Color {
    return Color.mkWithKeyword(255, 255, 105, 180, 'hotpink')
  }

  //

  static get IndianRed(): Color {
    return Color.mkWithKeyword(255, 205, 92, 92, 'indianred')
  }

  //

  static get Indigo(): Color {
    return Color.mkWithKeyword(255, 75, 0, 130, 'indigo')
  }

  //

  static get Ivory(): Color {
    return Color.mkWithKeyword(255, 255, 255, 240, 'ivory')
  }

  //

  static get Khaki(): Color {
    return Color.mkWithKeyword(255, 240, 230, 140, 'khaki')
  }

  //

  static get Lavender(): Color {
    return Color.mkWithKeyword(255, 230, 230, 250, 'lavender')
  }

  //

  static get LavenderBlush(): Color {
    return Color.mkWithKeyword(255, 255, 240, 245, 'lavenderblush')
  }

  //

  static get LawnGreen(): Color {
    return Color.mkWithKeyword(255, 124, 252, 0, 'lawngreen')
  }

  //

  static get LemonChiffon(): Color {
    return Color.mkWithKeyword(255, 255, 250, 205, 'lemonchiffon')
  }

  //

  static get LightBlue(): Color {
    return Color.mkWithKeyword(255, 173, 216, 230, 'lightblue')
  }

  //

  static get LightCoral(): Color {
    return Color.mkWithKeyword(255, 240, 128, 128, 'lightcoral')
  }

  //

  static get LightCyan(): Color {
    return Color.mkWithKeyword(255, 224, 255, 255, 'lightcyan')
  }

  //

  static get LightGoldenrodYellow(): Color {
    return Color.mkWithKeyword(255, 250, 250, 210, 'lightgoldenrodyellow')
  }

  //

  static get LightGray(): Color {
    return Color.mkWithKeyword(255, 211, 211, 211, 'lightgray')
  }

  //

  static get LightGreen(): Color {
    return Color.mkWithKeyword(255, 144, 238, 144, 'lightgreen')
  }

  //

  static get LightPink(): Color {
    return Color.mkWithKeyword(255, 255, 182, 193, 'lightpink')
  }

  //

  static get LightSalmon(): Color {
    return Color.mkWithKeyword(255, 255, 160, 122, 'lightsalmon')
  }

  //

  static get LightSeaGreen(): Color {
    return Color.mkWithKeyword(255, 32, 178, 170, 'lightseagreen')
  }

  //

  static get LightSkyBlue(): Color {
    return Color.mkWithKeyword(255, 135, 206, 250, 'lightskyblue')
  }

  //

  static get LightSlateGray(): Color {
    return Color.mkWithKeyword(255, 119, 136, 153, 'lightslategray')
  }

  //

  static get LightSteelBlue(): Color {
    return Color.mkWithKeyword(255, 176, 196, 222, 'lightsteelblue')
  }

  //

  static get LightYellow(): Color {
    return Color.mkWithKeyword(255, 255, 255, 224, 'lightyellow')
  }

  //

  static get Lime(): Color {
    return Color.mkWithKeyword(255, 0, 255, 0, 'lime')
  }

  //

  static get LimeGreen(): Color {
    return Color.mkWithKeyword(255, 50, 205, 50, 'limegreen')
  }

  //

  static get Linen(): Color {
    return Color.mkWithKeyword(255, 250, 240, 230, 'linen')
  }

  //

  static get Magenta(): Color {
    return Color.mkWithKeyword(255, 255, 0, 255, 'magenta')
  }

  //

  static get Maroon(): Color {
    return Color.mkWithKeyword(255, 128, 0, 0, 'maroon')
  }

  //

  static get MediumAquamarine(): Color {
    return Color.mkWithKeyword(255, 102, 205, 170, 'mediumaquamarine')
  }

  //

  static get MediumBlue(): Color {
    return Color.mkWithKeyword(255, 0, 0, 205, 'mediumblue')
  }

  //

  static get MediumOrchid(): Color {
    return Color.mkWithKeyword(255, 186, 85, 211, 'mediumorchid')
  }

  //

  static get MediumPurple(): Color {
    return Color.mkWithKeyword(255, 147, 112, 219, 'mediumpurple')
  }

  //

  static get MediumSeaGreen(): Color {
    return Color.mkWithKeyword(255, 60, 179, 113, 'mediumseagreen')
  }

  //

  static get MediumSlateBlue(): Color {
    return Color.mkWithKeyword(255, 123, 104, 238, 'mediumslateblue')
  }

  //

  static get MediumSpringGreen(): Color {
    return Color.mkWithKeyword(255, 0, 250, 154, 'mediumspringgreen')
  }

  //

  static get MediumTurquoise(): Color {
    return Color.mkWithKeyword(255, 72, 209, 204, 'mediumturquoise')
  }

  //

  static get MediumVioletRed(): Color {
    return Color.mkWithKeyword(255, 199, 21, 133, 'mediumvioletred')
  }

  //

  static get MidnightBlue(): Color {
    return Color.mkWithKeyword(255, 25, 25, 112, 'midnightblue')
  }

  //

  static get MintCream(): Color {
    return Color.mkWithKeyword(255, 245, 255, 250, 'mintcream')
  }

  //

  static get MistyRose(): Color {
    return Color.mkWithKeyword(255, 255, 228, 225, 'mistyrose')
  }

  //

  static get Moccasin(): Color {
    return Color.mkWithKeyword(255, 255, 228, 181, 'moccasin')
  }

  //

  static get NavajoWhite(): Color {
    return Color.mkWithKeyword(255, 255, 222, 173, 'navajowhite')
  }

  //

  static get Navy(): Color {
    return Color.mkWithKeyword(255, 0, 0, 128, 'navy')
  }

  //

  static get OldLace(): Color {
    return Color.mkWithKeyword(255, 253, 245, 230, 'oldlace')
  }

  //

  static get Olive(): Color {
    return Color.mkWithKeyword(255, 128, 128, 0, 'olive')
  }

  //

  static get OliveDrab(): Color {
    return Color.mkWithKeyword(255, 107, 142, 35, 'olivedrab')
  }

  //

  static get Orange(): Color {
    return Color.mkWithKeyword(255, 255, 165, 0, 'orange')
  }

  //

  static get OrangeRed(): Color {
    return Color.mkWithKeyword(255, 255, 69, 0, 'orangered')
  }

  //

  static get Orchid(): Color {
    return Color.mkWithKeyword(255, 218, 112, 214, 'orchid')
  }

  //

  static get PaleGoldenrod(): Color {
    return Color.mkWithKeyword(255, 238, 232, 170, 'palegoldenrod')
  }

  //

  static get PaleGreen(): Color {
    return Color.mkWithKeyword(255, 152, 251, 152, 'palegreen')
  }

  //

  static get PaleTurquoise(): Color {
    return Color.mkWithKeyword(255, 175, 238, 238, 'paleturquoise')
  }

  //

  static get PaleVioletRed(): Color {
    return Color.mkWithKeyword(255, 219, 112, 147, 'palevioletred')
  }

  //

  static get PapayaWhip(): Color {
    return Color.mkWithKeyword(255, 255, 239, 213, 'papayawhip')
  }

  //

  static get PeachPuff(): Color {
    return Color.mkWithKeyword(255, 255, 218, 185, 'peachpuff')
  }

  //

  static get Peru(): Color {
    return Color.mkWithKeyword(255, 205, 133, 63, 'peru')
  }

  //

  static get Pink(): Color {
    return Color.mkWithKeyword(255, 255, 192, 203, 'pink')
  }

  //

  static get Plum(): Color {
    return Color.mkWithKeyword(255, 221, 160, 221, 'plum')
  }

  //

  static get PowderBlue(): Color {
    return Color.mkWithKeyword(255, 176, 224, 230, 'powderblue')
  }

  //

  static get Purple(): Color {
    return Color.mkWithKeyword(255, 128, 0, 128, 'purple')
  }

  //

  static get Red(): Color {
    return Color.mkWithKeyword(255, 255, 0, 0, 'red')
  }

  //

  static get RosyBrown(): Color {
    return Color.mkWithKeyword(255, 188, 143, 143, 'rosybrown')
  }

  //

  static get RoyalBlue(): Color {
    return Color.mkWithKeyword(255, 65, 105, 225, 'royalblue')
  }

  //

  static get SaddleBrown(): Color {
    return Color.mkWithKeyword(255, 139, 69, 19, 'saddlebrown')
  }

  //

  static get Salmon(): Color {
    return Color.mkWithKeyword(255, 250, 128, 114, 'salmon')
  }

  //

  static get SandyBrown(): Color {
    return Color.mkWithKeyword(255, 244, 164, 96, 'sandybrown')
  }

  //

  static get SeaGreen(): Color {
    return Color.mkWithKeyword(255, 46, 139, 87, 'seagreen')
  }

  //

  static get SeaShell(): Color {
    return Color.mkWithKeyword(255, 255, 245, 238, 'seashell')
  }

  //

  static get Sienna(): Color {
    return Color.mkWithKeyword(255, 160, 82, 45, 'sienna')
  }

  //

  static get Silver(): Color {
    return Color.mkWithKeyword(255, 192, 192, 192, 'silver')
  }

  //

  static get SkyBlue(): Color {
    return Color.mkWithKeyword(255, 135, 206, 235, 'skyblue')
  }

  //

  static get SlateBlue(): Color {
    return Color.mkWithKeyword(255, 106, 90, 205, 'slateblue')
  }

  //

  static get SlateGray(): Color {
    return Color.mkWithKeyword(255, 112, 128, 144, 'slategray')
  }

  //

  static get Snow(): Color {
    return Color.mkWithKeyword(255, 255, 250, 250, 'snow')
  }

  //

  static get SpringGreen(): Color {
    return Color.mkWithKeyword(255, 0, 255, 127, 'springgreen')
  }

  //

  static get SteelBlue(): Color {
    return Color.mkWithKeyword(255, 70, 130, 180, 'steelblue')
  }

  //

  static get Tan(): Color {
    return Color.mkWithKeyword(255, 210, 180, 140, 'tan')
  }

  //

  static get Teal(): Color {
    return Color.mkWithKeyword(255, 0, 128, 128, 'teal')
  }

  //

  static get Thistle(): Color {
    return Color.mkWithKeyword(255, 216, 191, 216, 'thistle')
  }

  //

  static get Tomato(): Color {
    return Color.mkWithKeyword(255, 255, 99, 71, 'tomato')
  }

  //

  static get Transparent(): Color {
    return Color.mkWithKeyword(0, 255, 255, 255, 'transparent')
  }

  //

  static get Turquoise(): Color {
    return Color.mkWithKeyword(255, 64, 224, 208, 'turquoise')
  }

  //

  static get Violet(): Color {
    return Color.mkWithKeyword(255, 238, 130, 238, 'violet')
  }

  //

  static get Wheat(): Color {
    return Color.mkWithKeyword(255, 245, 222, 179, 'wheat')
  }

  //

  static get White(): Color {
    return Color.mkWithKeyword(255, 255, 255, 255, 'white')
  }

  //

  static get WhiteSmoke(): Color {
    return Color.mkWithKeyword(255, 245, 245, 245, 'whitesmoke')
  }

  //

  static get Yellow(): Color {
    return Color.mkWithKeyword(255, 255, 255, 0, 'yellow')
  }

  //

  static get YellowGreen(): Color {
    return Color.mkWithKeyword(255, 154, 205, 50, 'yellowgreen')
  }
}
