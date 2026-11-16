package com.planificacion.api.export;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Estilos del informe y atajos para escribir celdas. Los colores son los de la app. */
final class ExcelStyles {

    static final String TEAL = "0F766E";
    static final String TEAL_DARK = "0B5C56";
    static final String AMBER = "F5A524";
    static final String CORAL = "F2743A";
    static final String GREEN = "17A34A";
    static final String RED = "E5484D";
    static final String GREY = "8A9A97";

    final CellStyle title;
    final CellStyle subtitle;
    final CellStyle section;
    final CellStyle header;
    final CellStyle text;
    final CellStyle wrapped;
    final CellStyle bold;
    final CellStyle date;
    final CellStyle integer;
    final CellStyle decimal;
    final CellStyle money;
    final CellStyle moneyBold;
    final CellStyle percent;
    final CellStyle done;
    final CellStyle centered;

    ExcelStyles(XSSFWorkbook wb) {
        short dateFormat = wb.createDataFormat().getFormat("dd/mm/yyyy");
        short moneyFormat = wb.createDataFormat().getFormat("#,##0.00");
        short decimalFormat = wb.createDataFormat().getFormat("#,##0.0");
        short intFormat = wb.createDataFormat().getFormat("#,##0");
        short percentFormat = wb.createDataFormat().getFormat("0%");

        title = wb.createCellStyle();
        title.setFont(font(wb, 18, true, TEAL_DARK));

        subtitle = wb.createCellStyle();
        subtitle.setFont(font(wb, 11, false, "5F716E"));

        section = wb.createCellStyle();
        section.setFont(font(wb, 13, true, TEAL_DARK));

        XSSFCellStyle head = wb.createCellStyle();
        head.setFont(font(wb, 11, true, "FFFFFF"));
        head.setFillForegroundColor(color(TEAL));
        head.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        head.setAlignment(HorizontalAlignment.CENTER);
        head.setVerticalAlignment(VerticalAlignment.CENTER);
        head.setWrapText(true);
        header = head;

        text = bordered(wb);
        wrapped = bordered(wb);
        wrapped.setWrapText(true);
        wrapped.setVerticalAlignment(VerticalAlignment.TOP);

        bold = bordered(wb);
        bold.setFont(font(wb, 11, true, "0B1B1C"));

        date = bordered(wb);
        date.setDataFormat(dateFormat);
        date.setAlignment(HorizontalAlignment.LEFT);

        integer = bordered(wb);
        integer.setDataFormat(intFormat);
        decimal = bordered(wb);
        decimal.setDataFormat(decimalFormat);
        money = bordered(wb);
        money.setDataFormat(moneyFormat);
        moneyBold = bordered(wb);
        moneyBold.setDataFormat(moneyFormat);
        moneyBold.setFont(font(wb, 11, true, "0B1B1C"));
        percent = bordered(wb);
        percent.setDataFormat(percentFormat);

        centered = bordered(wb);
        centered.setAlignment(HorizontalAlignment.CENTER);

        XSSFCellStyle ok = bordered(wb);
        ok.setAlignment(HorizontalAlignment.CENTER);
        ok.setFont(font(wb, 11, true, "0B6B2E"));
        ok.setFillForegroundColor(color("D9F2E1"));
        ok.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        done = ok;
    }

    private static XSSFCellStyle bordered(XSSFWorkbook wb) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBottomBorderColor(color("DDE7E4"));
        return style;
    }

    private static XSSFFont font(XSSFWorkbook wb, int size, boolean isBold, String hex) {
        XSSFFont font = wb.createFont();
        font.setFontHeightInPoints((short) size);
        font.setBold(isBold);
        font.setColor(color(hex));
        return font;
    }

    static XSSFColor color(String hex) {
        return new XSSFColor(rgb(hex), null);
    }

    static byte[] rgb(String hex) {
        return new byte[]{
                (byte) Integer.parseInt(hex.substring(0, 2), 16),
                (byte) Integer.parseInt(hex.substring(2, 4), 16),
                (byte) Integer.parseInt(hex.substring(4, 6), 16)};
    }

    // ------------------------------------------------------------- celdas

    static Row row(Sheet sheet, int index) {
        Row row = sheet.getRow(index);
        return row != null ? row : sheet.createRow(index);
    }

    Cell put(Sheet sheet, int rowIndex, int col, String value, CellStyle style) {
        Cell cell = row(sheet, rowIndex).createCell(col);
        cell.setCellValue(value == null ? "" : value);
        cell.setCellStyle(style);
        return cell;
    }

    Cell put(Sheet sheet, int rowIndex, int col, double value, CellStyle style) {
        Cell cell = row(sheet, rowIndex).createCell(col);
        cell.setCellValue(value);
        cell.setCellStyle(style);
        return cell;
    }

    /** Número opcional: la celda queda vacía (pero con estilo) si no hay valor. */
    Cell put(Sheet sheet, int rowIndex, int col, BigDecimal value, CellStyle style) {
        Cell cell = row(sheet, rowIndex).createCell(col);
        if (value != null) cell.setCellValue(value.doubleValue());
        cell.setCellStyle(style);
        return cell;
    }

    Cell put(Sheet sheet, int rowIndex, int col, LocalDate value) {
        Cell cell = row(sheet, rowIndex).createCell(col);
        if (value != null) cell.setCellValue(value);
        cell.setCellStyle(date);
        return cell;
    }

    /** Fila de encabezados de tabla, más alta para que quepan dos líneas. */
    void headers(Sheet sheet, int rowIndex, String... names) {
        Row row = row(sheet, rowIndex);
        row.setHeightInPoints(30);
        for (int i = 0; i < names.length; i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(names[i]);
            cell.setCellStyle(header);
        }
    }

    /** Hoja de datos: encabezados fijos al desplazarse y filtros en cada columna. */
    void asTable(Sheet sheet, int headerRow, int lastRow, int columns) {
        sheet.createFreezePane(0, headerRow + 1);
        if (lastRow > headerRow) {
            sheet.setAutoFilter(new CellRangeAddress(headerRow, lastRow, 0, columns - 1));
        }
    }

    /** Anchos en caracteres aproximados. */
    static void widths(Sheet sheet, int... chars) {
        for (int i = 0; i < chars.length; i++) {
            sheet.setColumnWidth(i, Math.min(chars[i], 250) * 256);
        }
    }
}
