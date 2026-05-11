# Database

Supabase (Postgres). All tables have Row Level Security enabled. Users can only read and write their own data.

---

## Schema

### `profiles`

Auto-created on signup via a Postgres trigger on `auth.users`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, references `auth.users.id` |
| `email` | `text` | Copied from auth.users on creation |
| `height_in` | `numeric` | Height in inches |
| `weight_lbs` | `numeric` | Current weight |
| `goal_weight_lbs` | `numeric` | Target weight |
| `weekly_workouts_target` | `integer` | Default 4 |
| `calorie_target` | `integer` | Daily calorie goal |
| `protein_target` | `integer` | Daily protein goal in grams |
| `created_at` | `timestamptz` | Auto-set |

### `workouts`

One row per session.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | References `auth.users.id` |
| `name` | `text` | e.g. "Push Day", "Full Body HIIT" |
| `date` | `date` | Session date |
| `notes` | `text` | Optional session notes |
| `created_at` | `timestamptz` | Auto-set |

### `exercises`

Exercises within a workout session.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `workout_id` | `uuid` | References `workouts.id` |
| `name` | `text` | e.g. "Bench Press" |
| `muscle_group` | `text` | e.g. "Chest", "Back" |
| `order_index` | `integer` | Display order within workout |

### `sets`

Individual sets within an exercise.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `exercise_id` | `uuid` | References `exercises.id` |
| `set_number` | `integer` | 1-indexed |
| `weight_lbs` | `numeric` | Weight used |
| `reps` | `integer` | Reps completed |
| `completed` | `boolean` | Whether the set was logged as done |

### `food_logs`

One row per food item logged.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | References `auth.users.id` |
| `date` | `date` | Log date |
| `meal_type` | `text` | `breakfast`, `lunch`, `dinner`, `snack` |
| `food_name` | `text` | Food description |
| `calories` | `integer` | |
| `protein_g` | `numeric` | |
| `carbs_g` | `numeric` | |
| `fat_g` | `numeric` | |
| `created_at` | `timestamptz` | Auto-set |

### `recipes`

Saved recipes, optionally AI-generated.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | References `auth.users.id` |
| `name` | `text` | Recipe name |
| `ingredients` | `jsonb` | Array of `{ name, amount, unit }` |
| `instructions` | `text` | Full preparation steps |
| `calories_per_serving` | `integer` | |
| `protein_g` | `numeric` | Per serving |
| `carbs_g` | `numeric` | Per serving |
| `fat_g` | `numeric` | Per serving |
| `ai_generated` | `boolean` | Whether Claude generated this recipe |
| `created_at` | `timestamptz` | Auto-set |

### `meal_plans`

Weekly meal plans, optionally AI-generated.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | References `auth.users.id` |
| `week_start` | `date` | Monday of the planned week |
| `plan` | `jsonb` | Full plan structure (days → meals → recipes) |
| `created_at` | `timestamptz` | Auto-set |

---

## RLS Policies

All tables follow the same pattern:

```sql
-- Users can only select their own rows
CREATE POLICY "select own" ON workouts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own rows
CREATE POLICY "insert own" ON workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own rows
CREATE POLICY "update own" ON workouts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own rows
CREATE POLICY "delete own" ON workouts
  FOR DELETE USING (auth.uid() = user_id);
```

`profiles` uses `auth.uid() = id` instead of `user_id`.

`exercises` and `sets` are scoped indirectly — RLS on parent tables (`workouts`, `exercises`) is sufficient since joins are always user-scoped.

---

## Migrations

Migrations are managed via the Supabase dashboard or CLI. The schema above is already applied to the remote project.

To apply via CLI:

```bash
supabase db push
```

To generate TypeScript types after schema changes:

```bash
supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts
```

---

## Profile Trigger

A Postgres trigger auto-creates a `profiles` row when a new user signs up:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```
