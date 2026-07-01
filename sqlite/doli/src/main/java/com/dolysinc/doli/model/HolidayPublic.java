package com.dolysinc.doli.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.time.LocalDate;

 enum TypePeriode {
    MATIN, 
    APRES_MIDI, 
    JOURNEE_ENTIERE
}

@Entity
@Table(name = "holiday_public")
public class HolidayPublic{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Enumerated(EnumType.STRING)
    private TypePeriode typePeriode;
    private LocalDate dateHoliday;
    private String label;
    private Long fkUser;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDate getDateHoliday() {
        return dateHoliday;
    }

    public void setDateHoliday(LocalDate dateHoliday) {
        this.dateHoliday = dateHoliday;
    }


    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public HolidayPublic(){}
    public HolidayPublic(LocalDate dateHoliday ,String label, Long fkUser ){
        this.dateHoliday=dateHoliday;
        this.label=label;
        this.fkUser=fkUser;
       
    }

    public Long getFkUser() {
        return fkUser;
    }

    public void setFkUser(Long fkUser) {
        this.fkUser = fkUser;
    }

    public TypePeriode getTypePeriode() {
        return typePeriode;
    }

    public void setTypePeriode(TypePeriode typePeriode) {
        this.typePeriode = typePeriode;
    }

}