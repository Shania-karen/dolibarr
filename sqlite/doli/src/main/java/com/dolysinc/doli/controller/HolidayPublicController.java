package com.dolysinc.doli.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.dolysinc.doli.model.HolidayPublic;
import org.springframework.http.ResponseEntity;
import java.time.LocalDate;

import java.util.Optional;
import com.dolysinc.doli.repository.HolidayPublicRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/holidayPublic")
public class HolidayPublicController{
    @Autowired 
    private HolidayPublicRepository holidayPublicRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostConstruct
    public void init() {
        try {
            jdbcTemplate.execute("ALTER TABLE holiday_public ADD COLUMN type_periode VARCHAR(255)");
            System.out.println("Column type_periode successfully added to holiday_public");
        } catch (Exception e) {
            System.out.println("Column type_periode might already exist: " + e.getMessage());
        }
    }

    @GetMapping
    public List<HolidayPublic> getAllHolidayPublics(){
        return holidayPublicRepository.findAll();
    }
    @PostMapping
    public HolidayPublic saveHoliday(@RequestBody HolidayPublic holiday){
        return holidayPublicRepository.save(holiday);
    }
    @PutMapping("/{id}")
    public ResponseEntity<?> updateHoliday(
        @PathVariable Long id,
        @RequestBody HolidayPublic updatedData
    ){
        Optional<HolidayPublic> optionalHoliday = holidayPublicRepository.findById(id);

        if (optionalHoliday.isEmpty()) { 
            return ResponseEntity.notFound().build();
        }
        HolidayPublic holidayToUpdate = optionalHoliday.get();
        holidayToUpdate.setDateHoliday(updatedData.getDateHoliday());
        holidayToUpdate.setLabel(updatedData.getLabel());
        holidayToUpdate.setFkUser(updatedData.getFkUser());
        holidayToUpdate.setTypePeriode(updatedData.getTypePeriode());

        holidayPublicRepository.save(holidayToUpdate);
        return ResponseEntity.ok().build();

    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable Long id){
        if (holidayPublicRepository.existsById(id)) {
            holidayPublicRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}


