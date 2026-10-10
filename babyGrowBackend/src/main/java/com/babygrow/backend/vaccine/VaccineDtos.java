package com.babygrow.backend.vaccine;

/**
 * 疫苗详情接口的请求/响应体，与前端 {@code store/vaccine.ts} 的 {@code VaccineDetail} 对齐。
 *
 * <p>{@code datetime} 与 {@code nextAppointment} 在前端是**自由文本输入框**，所以这里是
 * 展示串。后端的格式化与解析互为逆运算——只要用户不改动默认值，往返就一定成立；
 * 手输的无法解析的值会得到一条明确的报错，而不是被静默吞掉。
 */
public final class VaccineDtos {

    private VaccineDtos() {
    }

    public record AttachmentView(String name, String image) {
    }

    public record VaccineDetailView(String title,
                                    String datetime,
                                    String location,
                                    String administeredBy,
                                    String doseLabel,
                                    double doseProgress,
                                    String nextAppointment,
                                    String nextNote,
                                    String notes,
                                    AttachmentView attachment) {
    }

    /** 前端 PUT 的是 Partial<VaccineDetail>，各字段都可缺省 */
    public record VaccinePatchRequest(String title,
                                      String datetime,
                                      String location,
                                      String administeredBy,
                                      String doseLabel,
                                      String nextAppointment,
                                      String nextNote,
                                      String notes,
                                      AttachmentView attachment) {
    }
}
