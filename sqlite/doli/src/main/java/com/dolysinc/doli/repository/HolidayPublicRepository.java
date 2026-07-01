package com.dolysinc.doli.repository;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.dolysinc.doli.model.HolidayPublic;

@Repository
public interface HolidayPublicRepository extends JpaRepository<HolidayPublic, Long>{
    Optional <HolidayPublic> findByLabel( String label);
}