import JsPDF from 'jspdf'
import QRcode from 'qrcode'

class PdfPrint {
  constructor (opts) {
    opts = opts || {}
    opts.pageSize = opts.pageSize || 'a4'
    this.pdf = new JsPDF('', 'pt', opts.pageSize)
    this.pdf.addFont('NotoSansCJKtc-Regular.ttf', 'NotoSansCJKtc', 'normal')
    this.pdf.setFont('NotoSansCJKtc')
    this.page = {
      scaleHeight: this.pdf.getPageHeight(),
      scaleWidth: this.pdf.getPageWidth(),
      height: opts.pageHeight || 872,
      width: opts.pageWidth || 572,
      left: opts.pageLeft || 0,
      top: opts.pageTop || 0,
      right: opts.pageRight || 0,
      buttom: opts.pageButtom || 0
    }

  }

  printText (x, y, x1, y1, text, options) {
    if (!isNaN(text)) {
      text = String(text)
    }
    if (x1 > this.page.width - this.page.left - this.page.right) {
        this.pdf.addPage()
        x1 = x1 - x + this.page.left
        x = this.page.left
    }
    if (y1 > this.page.height - this.page.top - this.page.buttom) {
        this.pdf.addPage()
        y1 = y1 - y + this.page.top
        y = this.page.top
    }
    options = options || {}
    options.left = options.left || 0
    options.top = options.top || 0
    options.right = options.right || 0
    options.buttom = options.buttom || 0
    options.fontSize = options.fontSize || 8
    options.vertical = options.vertical || 'left'
    options.horizontal = options.horizontal || 'top'
    options.lineTop = options.lineTop || false
    options.lineButtom = options.lineButtom || false
    options.lineLeft = options.lineLeft || false
    options.lineRight = options.lineRight || false
    if (options.lineTop) {
      this.pdf.line(x, y, x1, y)
    }
    if (options.lineLeft) {
      this.pdf.line(x, y, x, y1)
    }
    if (options.lineRight) {
      this.pdf.line(x1, y, x1, y1)
    }
    if (options.lineButtom) {
      this.pdf.line(x, y1, x1, y1)
    }
    var textLen = 0
    const arr = text.split('')
    arr.forEach(item => {
      textLen += Math.ceil(item.charCodeAt().toString(2).length / 8)
    })
    textLen /= 2
    switch(options.vertical) {
      case 'right':
        var tx = x1 - options.fontSize * textLen - options.right
        break
      case 'center':
        tx = (x1 + x) / 2 - textLen * options.fontSize / 2
        break
      default:
        tx = x + options.left
        break
    }
    switch(options.horizontal) {
      case 'center':
        var ty = (y1 + y) /2 + options.fontSize / 2
        break
      case 'buttom':
        ty = y1 - options.buttom
        break
      default:
        ty = y + options.top + options.fontSize
        break
    }
    this.pdf.text(tx, ty, text)
    return {x: x, y: y, x1: x1, y1: y1}
  }

  async printQrcode (x, y, x1, y1, text, options) {
    if (!isNaN(text)) {
      text = String(text)
    }
    if (x1 > this.page.width - this.page.left - this.page.right) {
      this.pdf.addPage()
      x1 = x1 - x + this.page.left
      x = this.page.left
    }
    if (y1 > this.page.height - this.page.top - this.page.buttom) {
        this.pdf.addPage()
        y1 = y1 - y + this.page.top
        y = this.page.top
    }
    options = options || {}
    options.left = options.left || 0
    options.top = options.top || 0
    options.right = options.right || 0
    options.buttom = options.buttom || 0
    options.fontSize = options.fontSize || 8
    options.vertical = options.vertical || 'left'
    options.horizontal = options.horizontal || 'top'
    options.lineTop = options.lineTop || false
    options.lineButtom = options.lineButtom || false
    options.lineLeft = options.lineLeft || false
    options.lineRight = options.lineRight || false
    if (options.lineTop) {
      this.pdf.line(x, y, x1, y)
    }
    if (options.lineLeft) {
      this.pdf.line(x, y, x, y1)
    }
    if (options.lineRight) {
      this.pdf.line(x1, y, x1, y1)
    }
    if (options.lineButtom) {
      this.pdf.line(x, y1, x1, y1)
    }
    /*
    var textLen = 0
    const arr = text.split('')
    arr.forEach(item => {
      textLen += Math.ceil(item.charCodeAt().toString(2).length / 8)
    })
    textLen /= 2
    switch(options.vertical) {
      case 'right':
        var tx = x1 - options.fontSize * textLen - options.right
        break
      case 'center':
        tx = (x1 + x) / 2 - textLen * options.fontSize / 2
        break
      default:
        tx = x + options.left
        break
    }
    switch(options.horizontal) {
      case 'center':
        var ty = (y1 + y) /2 + options.fontSize / 2
        break
      case 'buttom':
        ty = y1 - options.buttom
        break
      default:
        ty = y + options.top + options.fontSize
        break
    }
    */
    var url = await QRcode.toDataURL(text)
    // console.log('ur', url)
    this.pdf.addImage(url, 'JPEG', x, y, x1 - x, y1 - y, '', 'FAST')
    // this.pdf.text(tx, ty, text)
    return {x: x, y: y, x1: x1, y1: y1}
  }
}

export default PdfPrint