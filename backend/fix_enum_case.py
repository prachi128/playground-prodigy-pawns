"""
Script to fix enum case mismatch in the database.
Converts uppercase enum values (STUDENT, COACH, ADMIN) to lowercase (student, coach, admin).
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
from urllib.parse import quote_plus

# Load environment variables
load_dotenv()

# Get database credentials
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")

# URL-encode the password
encoded_password = quote_plus(DB_PASSWORD)

# Create database URL
DATABASE_URL = f"postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def fix_enum_case():
    """Fix enum case mismatch by updating database values"""
    engine = create_engine(DATABASE_URL)
    
    print("Fixing enum case mismatch in database...")
    
    with engine.connect() as conn:
        # Check if the column is a native enum type or VARCHAR
        result = conn.execute(text("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'role'
        """))
        row = result.fetchone()
        
        if row:
            data_type = row[0]
            print(f"Column type: {data_type}")
            
            if data_type == 'USER-DEFINED':  # Native enum type
                print("WARNING: Detected native PostgreSQL enum type")
                print("Converting column to VARCHAR for case-insensitive handling...")
                
                # Get the enum type name
                enum_result = conn.execute(text("""
                    SELECT udt_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'role'
                """))
                enum_name = enum_result.fetchone()[0]
                print(f"Enum type name: {enum_name}")
                
                # Step 1: Convert enum values to lowercase text and update column type to VARCHAR
                print("Step 1: Converting values and changing column type...")
                conn.execute(text("""
                    ALTER TABLE users 
                    ALTER COLUMN role TYPE VARCHAR(20) 
                    USING LOWER(role::text)
                """))
                
                print("SUCCESS: Column converted to VARCHAR with lowercase values")
                print("NOTE: The CaseInsensitiveEnum TypeDecorator will now handle this column properly")
            else:  # VARCHAR or other string type
                print("Updating VARCHAR column values to lowercase...")
                conn.execute(text("""
                    UPDATE users 
                    SET role = LOWER(role)
                    WHERE role != LOWER(role)
                """))
            
            conn.commit()
            print("SUCCESS: Enum values updated successfully!")
            
            # Verify the fix
            result = conn.execute(text("SELECT DISTINCT role FROM users"))
            roles = [row[0] for row in result]
            print(f"Current role values: {roles}")
        else:
            print("ERROR: Could not find 'role' column in 'users' table")

if __name__ == "__main__":
    try:
        fix_enum_case()
    except Exception as e:
        print(f"ERROR: Error fixing enum case: {e}")
        import traceback
        traceback.print_exc()
