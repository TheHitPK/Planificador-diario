package com.planificacion.api.export;

import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xddf.usermodel.XDDFColor;
import org.apache.poi.xddf.usermodel.XDDFLineProperties;
import org.apache.poi.xddf.usermodel.XDDFShapeProperties;
import org.apache.poi.xddf.usermodel.XDDFSolidFillProperties;
import org.apache.poi.xddf.usermodel.chart.AxisCrossBetween;
import org.apache.poi.xddf.usermodel.chart.AxisCrosses;
import org.apache.poi.xddf.usermodel.chart.AxisPosition;
import org.apache.poi.xddf.usermodel.chart.BarDirection;
import org.apache.poi.xddf.usermodel.chart.BarGrouping;
import org.apache.poi.xddf.usermodel.chart.ChartTypes;
import org.apache.poi.xddf.usermodel.chart.LegendPosition;
import org.apache.poi.xddf.usermodel.chart.MarkerStyle;
import org.apache.poi.xddf.usermodel.chart.XDDFBarChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFCategoryAxis;
import org.apache.poi.xddf.usermodel.chart.XDDFChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFDataSource;
import org.apache.poi.xddf.usermodel.chart.XDDFDataSourcesFactory;
import org.apache.poi.xddf.usermodel.chart.XDDFLineChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFNumericalDataSource;
import org.apache.poi.xddf.usermodel.chart.XDDFValueAxis;
import org.apache.poi.xssf.usermodel.XSSFChart;
import org.apache.poi.xssf.usermodel.XSSFDrawing;
import org.apache.poi.xssf.usermodel.XSSFSheet;

import org.openxmlformats.schemas.drawingml.x2006.chart.CTLineSer;
import org.openxmlformats.schemas.drawingml.x2006.chart.CTMarker;
import org.openxmlformats.schemas.drawingml.x2006.main.CTShapeProperties;

import java.util.List;

/** Gráficos nativos de Excel (se pueden editar en Excel: no son imágenes). */
final class ExcelCharts {

    /** Alto y ancho de cada gráfico, en filas y columnas de la hoja. */
    static final int ROWS = 16;
    static final int COLS = 8;

    /** Una serie: su nombre en la leyenda, la columna con los valores y su color (hex RRGGBB). */
    record Series(String name, CellRangeAddress values, String hex) {
    }

    private ExcelCharts() {
    }

    /**
     * Barras verticales agrupadas.
     *
     * @param percent el eje de valores va de 0 % a 100 %
     */
    static void bars(XSSFSheet sheet, int row, int col, String title, XDDFDataSource<String> categories,
                     List<Series> series, boolean percent) {
        bars(sheet, row, col, title, categories, series, percent, null);
    }

    /**
     * @param countUpTo si no es null, los valores son conteos de hasta ese máximo: el eje usa pasos enteros
     */
    static void bars(XSSFSheet sheet, int row, int col, String title, XDDFDataSource<String> categories,
                     List<Series> series, boolean percent, Long countUpTo) {
        XSSFChart chart = newChart(sheet, row, col, title, series.size() > 1);
        XDDFCategoryAxis x = chart.createCategoryAxis(AxisPosition.BOTTOM);
        XDDFValueAxis y = valueAxis(chart, percent);
        if (countUpTo != null) {
            y.setMinimum(0);
            y.setMajorUnit(Math.max(1, Math.ceil(countUpTo / 6.0)));
            y.setNumberFormat("0");
        }

        XDDFBarChartData data = (XDDFBarChartData) chart.createData(ChartTypes.BAR, x, y);
        data.setBarDirection(BarDirection.COL);
        data.setBarGrouping(BarGrouping.CLUSTERED);
        data.setVaryColors(false);
        for (Series s : series) {
            XDDFChartData.Series added = data.addSeries(categories, numbers(sheet, s.values()));
            added.setTitle(s.name(), null);
            XDDFShapeProperties shape = new XDDFShapeProperties();
            shape.setFillProperties(fill(s.hex()));
            added.setShapeProperties(shape);
        }
        chart.plot(data);
    }

    /** Líneas con marcadores (evolución en el tiempo). */
    static void lines(XSSFSheet sheet, int row, int col, String title, XDDFDataSource<String> categories,
                      List<Series> series) {
        XSSFChart chart = newChart(sheet, row, col, title, series.size() > 1);
        XDDFCategoryAxis x = chart.createCategoryAxis(AxisPosition.BOTTOM);
        XDDFValueAxis y = valueAxis(chart, false);

        XDDFLineChartData data = (XDDFLineChartData) chart.createData(ChartTypes.LINE, x, y);
        data.setVaryColors(false);
        for (Series s : series) {
            XDDFLineChartData.Series added =
                    (XDDFLineChartData.Series) data.addSeries(categories, numbers(sheet, s.values()));
            added.setTitle(s.name(), null);
            added.setSmooth(false);
            added.setMarkerStyle(MarkerStyle.CIRCLE);
            XDDFLineProperties line = new XDDFLineProperties();
            line.setFillProperties(fill(s.hex()));
            line.setWidth(2.25);
            XDDFShapeProperties shape = new XDDFShapeProperties();
            shape.setLineProperties(line);
            added.setShapeProperties(shape);
        }
        chart.plot(data);

        // Los marcadores toman el color de su línea (por defecto Excel los pinta de azul).
        CTLineSer[] plotted = chart.getCTChart().getPlotArea().getLineChartArray(0).getSerArray();
        for (int i = 0; i < plotted.length && i < series.size(); i++) {
            CTMarker marker = plotted[i].isSetMarker() ? plotted[i].getMarker() : plotted[i].addNewMarker();
            CTShapeProperties shape = marker.isSetSpPr() ? marker.getSpPr() : marker.addNewSpPr();
            byte[] rgb = ExcelStyles.rgb(series.get(i).hex());
            shape.addNewSolidFill().addNewSrgbClr().setVal(rgb);
            shape.addNewLn().addNewSolidFill().addNewSrgbClr().setVal(rgb);
        }
    }

    /** Categorías tomadas de una columna de texto de la hoja. */
    static XDDFDataSource<String> labels(XSSFSheet sheet, CellRangeAddress range) {
        return XDDFDataSourcesFactory.fromStringCellRange(sheet, range);
    }

    /** Categorías escritas directamente (para fechas, que en la hoja son celdas de fecha). */
    static XDDFDataSource<String> labels(List<String> values) {
        return XDDFDataSourcesFactory.fromArray(values.toArray(String[]::new));
    }

    static CellRangeAddress column(int firstRow, int lastRow, int col) {
        return new CellRangeAddress(firstRow, lastRow, col, col);
    }

    private static XDDFNumericalDataSource<Double> numbers(XSSFSheet sheet, CellRangeAddress range) {
        return XDDFDataSourcesFactory.fromNumericCellRange(sheet, range);
    }

    private static XSSFChart newChart(XSSFSheet sheet, int row, int col, String title, boolean legend) {
        XSSFDrawing drawing = sheet.createDrawingPatriarch();
        XSSFChart chart = drawing.createChart(drawing.createAnchor(0, 0, 0, 0, col, row, col + COLS, row + ROWS));
        chart.setTitleText(title);
        chart.setTitleOverlay(false);
        if (legend) chart.getOrAddLegend().setPosition(LegendPosition.BOTTOM);
        return chart;
    }

    private static XDDFValueAxis valueAxis(XSSFChart chart, boolean percent) {
        XDDFValueAxis y = chart.createValueAxis(AxisPosition.LEFT);
        y.setCrosses(AxisCrosses.AUTO_ZERO);
        y.setCrossBetween(AxisCrossBetween.BETWEEN);
        if (percent) {
            y.setMinimum(0);
            y.setMaximum(1);
            y.setNumberFormat("0%");
        }
        return y;
    }

    private static XDDFSolidFillProperties fill(String hex) {
        return new XDDFSolidFillProperties(XDDFColor.from(ExcelStyles.rgb(hex)));
    }
}
