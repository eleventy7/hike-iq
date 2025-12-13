/// Heart rate zone configuration
#[derive(Debug, Clone, Copy)]
pub struct HrZone {
    pub name: &'static str,
    pub min: u8,
    pub max: u8,
}

/// Personalized HR zones based on user profile
pub const HR_ZONES: [HrZone; 5] = [
    HrZone { name: "zone1", min: 0,   max: 116 },  // Recovery
    HrZone { name: "zone2", min: 117, max: 136 },  // Aerobic
    HrZone { name: "zone3", min: 137, max: 155 },  // Tempo
    HrZone { name: "zone4", min: 156, max: 175 },  // Threshold
    HrZone { name: "zone5", min: 176, max: 255 },  // VO2max
];

/// Get zone name for a heart rate value
pub fn get_zone(hr: u8) -> &'static str {
    HR_ZONES
        .iter()
        .find(|z| hr >= z.min && hr <= z.max)
        .map(|z| z.name)
        .unwrap_or("zone1")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zone1_boundary() {
        assert_eq!(get_zone(0), "zone1");
        assert_eq!(get_zone(116), "zone1");
    }

    #[test]
    fn test_zone2_boundary() {
        assert_eq!(get_zone(117), "zone2");
        assert_eq!(get_zone(136), "zone2");
    }

    #[test]
    fn test_zone3_boundary() {
        assert_eq!(get_zone(137), "zone3");
        assert_eq!(get_zone(155), "zone3");
    }

    #[test]
    fn test_zone4_boundary() {
        assert_eq!(get_zone(156), "zone4");
        assert_eq!(get_zone(175), "zone4");
    }

    #[test]
    fn test_zone5_boundary() {
        assert_eq!(get_zone(176), "zone5");
        assert_eq!(get_zone(255), "zone5");
    }
}
