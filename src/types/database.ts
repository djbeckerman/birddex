/** Shape of a row in public.profiles */
export interface ProfileRow {
  id:                    string;
  display_name:          string | null;
  username:              string | null;
  spirit_bird_code:      string | null;
  spirit_bird_photo_url: string | null;
  avatar_url:            string | null;
  is_public:             boolean;
  created_at:            string;
}

/** Shape of a row in public.sightings */
export interface SightingRow {
  id:              string;
  user_id:         string;
  species_code:    string;
  common_name:     string | null;
  scientific_name: string | null;
  spotted_date:    string;
  latitude:        number | null;
  longitude:       number | null;
  location_name:   string | null;
  notes:           string | null;
  photo_url:       string | null;
  created_at:      string;
}
