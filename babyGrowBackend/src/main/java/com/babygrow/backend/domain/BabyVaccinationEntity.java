package com.babygrow.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

/** 一次疫苗接种记录。 */
@Entity
@Table(name = "baby_vaccinations")
public class BabyVaccinationEntity {

    public static final String STATUS_SCHEDULED = "scheduled";
    public static final String STATUS_DONE = "done";
    public static final String STATUS_SKIPPED = "skipped";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "baby_id", nullable = false)
    private Long babyId;

    @Column(name = "vaccine_id")
    private Long vaccineId;

    @Column(name = "name", nullable = false, length = 64)
    private String name;

    @Column(name = "status", nullable = false, length = 16)
    private String status = STATUS_SCHEDULED;

    @Column(name = "administered_at")
    private Instant administeredAt;

    @Column(name = "location", length = 128)
    private String location;

    @Column(name = "administered_by", length = 64)
    private String administeredBy;

    @Column(name = "dose_label", length = 32)
    private String doseLabel;

    @Column(name = "dose_progress")
    private Double doseProgress;

    @Column(name = "next_appointment")
    private LocalDate nextAppointment;

    @Column(name = "next_note", length = 255)
    private String nextNote;

    @Column(name = "notes")
    private String notes;

    @Column(name = "attachment_name", length = 128)
    private String attachmentName;

    @Column(name = "attachment_media_id")
    private Long attachmentMediaId;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected BabyVaccinationEntity() {
        // JPA
    }

    public static BabyVaccinationEntity scheduled(Long babyId, String name) {
        BabyVaccinationEntity entity = new BabyVaccinationEntity();
        entity.babyId = babyId;
        entity.name = name;
        entity.status = STATUS_SCHEDULED;
        return entity;
    }

    public Long getId() {
        return id;
    }

    public Long getBabyId() {
        return babyId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Instant getAdministeredAt() {
        return administeredAt;
    }

    public void setAdministeredAt(Instant administeredAt) {
        this.administeredAt = administeredAt;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public String getAdministeredBy() {
        return administeredBy;
    }

    public void setAdministeredBy(String administeredBy) {
        this.administeredBy = administeredBy;
    }

    public String getDoseLabel() {
        return doseLabel;
    }

    public void setDoseLabel(String doseLabel) {
        this.doseLabel = doseLabel;
    }

    public Double getDoseProgress() {
        return doseProgress;
    }

    public void setDoseProgress(Double doseProgress) {
        this.doseProgress = doseProgress;
    }

    public LocalDate getNextAppointment() {
        return nextAppointment;
    }

    public void setNextAppointment(LocalDate nextAppointment) {
        this.nextAppointment = nextAppointment;
    }

    public String getNextNote() {
        return nextNote;
    }

    public void setNextNote(String nextNote) {
        this.nextNote = nextNote;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getAttachmentName() {
        return attachmentName;
    }

    public void setAttachmentName(String attachmentName) {
        this.attachmentName = attachmentName;
    }

    public Long getAttachmentMediaId() {
        return attachmentMediaId;
    }

    public void setAttachmentMediaId(Long attachmentMediaId) {
        this.attachmentMediaId = attachmentMediaId;
    }
}
