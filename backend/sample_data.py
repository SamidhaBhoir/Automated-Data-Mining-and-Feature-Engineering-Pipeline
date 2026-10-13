import os
import pandas as pd
import numpy as np

def generate_samples(base_dir="sample_datasets"):
    os.makedirs(base_dir, exist_ok=True)
    
    # 1. Customer Churn Dataset (Matches screenshot exactly!)
    np.random.seed(42)
    n = 1500
    customer_ids = [f"CUST-{1000 + i}" for i in range(n)]
    genders = np.random.choice(["Male", "Female"], size=n)
    senior = np.random.choice([0, 1], p=[0.84, 0.16], size=n)
    partner = np.random.choice(["Yes", "No"], size=n)
    dependents = np.random.choice(["Yes", "No"], p=[0.3, 0.7], size=n)
    tenure = np.random.randint(1, 73, size=n)
    phone_service = np.random.choice(["Yes", "No"], p=[0.9, 0.1], size=n)
    multiple_lines = np.random.choice(["No phone service", "No", "Yes"], size=n)
    internet_service = np.random.choice(["DSL", "Fiber optic", "No"], p=[0.34, 0.44, 0.22], size=n)
    online_security = np.random.choice(["Yes", "No", "No internet service"], size=n)
    online_backup = np.random.choice(["Yes", "No", "No internet service"], size=n)
    device_protection = np.random.choice(["Yes", "No", "No internet service"], size=n)
    tech_support = np.random.choice(["Yes", "No", "No internet service"], size=n)
    streaming_tv = np.random.choice(["Yes", "No", "No internet service"], size=n)
    streaming_movies = np.random.choice(["Yes", "No", "No internet service"], size=n)
    contract = np.random.choice(["Month-to-month", "One year", "Two year"], p=[0.55, 0.24, 0.21], size=n)
    paperless = np.random.choice(["Yes", "No"], size=n)
    payment = np.random.choice(["Electronic check", "Mailed check", "Bank transfer", "Credit card"], size=n)
    monthly_charges = np.round(np.random.uniform(18.25, 118.75, size=n), 2)
    total_charges = np.round(monthly_charges * tenure + np.random.normal(0, 15, size=n), 2)
    total_charges = np.clip(total_charges, 18.25, None)
    
    # Churn probability based on tenure and contract
    churn_prob = 0.5 * (contract == "Month-to-month") + 0.3 * (tenure < 12) + 0.1 * (internet_service == "Fiber optic")
    churn_prob = np.clip(churn_prob, 0.05, 0.85)
    churn = np.where(np.random.rand(n) < churn_prob, "Yes", "No")
    
    df_churn = pd.DataFrame({
        "customerID": customer_ids,
        "gender": genders,
        "SeniorCitizen": senior,
        "Partner": partner,
        "Dependents": dependents,
        "tenure": tenure,
        "PhoneService": phone_service,
        "MultipleLines": multiple_lines,
        "InternetService": internet_service,
        "OnlineSecurity": online_security,
        "OnlineBackup": online_backup,
        "DeviceProtection": device_protection,
        "TechSupport": tech_support,
        "StreamingTV": streaming_tv,
        "StreamingMovies": streaming_movies,
        "Contract": contract,
        "PaperlessBilling": paperless,
        "PaymentMethod": payment,
        "MonthlyCharges": monthly_charges,
        "TotalCharges": total_charges,
        "Churn": churn
    })
    
    # Introduce some realistic missing values and duplicates for pipeline demonstration
    missing_indices = np.random.choice(n, size=45, replace=False)
    df_churn.loc[missing_indices[:20], "TotalCharges"] = np.nan
    df_churn.loc[missing_indices[20:35], "TechSupport"] = np.nan
    df_churn.loc[missing_indices[35:], "DeviceProtection"] = np.nan
    
    # Add a few duplicate rows
    df_churn = pd.concat([df_churn, df_churn.iloc[:12]], ignore_index=True)
    
    churn_path = os.path.join(base_dir, "customer_churn.csv")
    df_churn.to_csv(churn_path, index=False)
    print(f"Generated {churn_path} with shape {df_churn.shape}")

    # 2. House Prices Dataset
    n_h = 1000
    sqft = np.random.normal(1800, 600, n_h).clip(500, 5000).astype(int)
    bedrooms = np.random.choice([1, 2, 3, 4, 5], p=[0.05, 0.25, 0.45, 0.2, 0.05], size=n_h)
    bathrooms = (bedrooms * 0.75 + np.random.choice([0, 0.5, 1], size=n_h)).clip(1, 4)
    location = np.random.choice(["Downtown", "Suburbs", "Uptown", "Rural"], p=[0.3, 0.4, 0.2, 0.1], size=n_h)
    year_built = np.random.randint(1970, 2024, size=n_h)
    loc_mult = {"Downtown": 1.4, "Suburbs": 1.1, "Uptown": 1.25, "Rural": 0.8}
    price = (sqft * 180 + bedrooms * 15000 + (year_built - 1970) * 800) * [loc_mult[l] for l in location] + np.random.normal(0, 20000, n_h)
    price = np.round(price, -2)
    
    df_house = pd.DataFrame({
        "Property_ID": [f"PROP-{2000+i}" for i in range(n_h)],
        "SquareFeet": sqft,
        "Bedrooms": bedrooms,
        "Bathrooms": bathrooms,
        "Neighborhood": location,
        "YearBuilt": year_built,
        "Price": price
    })
    
    # Introduce some missing values
    df_house.loc[np.random.choice(n_h, 25), "Bathrooms"] = np.nan
    df_house.loc[np.random.choice(n_h, 15), "SquareFeet"] = np.nan
    
    house_path = os.path.join(base_dir, "house_prices.csv")
    df_house.to_csv(house_path, index=False)
    print(f"Generated {house_path} with shape {df_house.shape}")

    # 3. Anime Dataset (matching user's reference code!)
    n_a = 1200
    anime_titles = [f"Anime Series #{100+i}" for i in range(n_a)]
    genres = np.random.choice(["Action, Adventure", "Comedy, Slice of Life", "Drama, Romance", "Fantasy, Sci-Fi", "Mystery, Psychological"], size=n_a)
    types = np.random.choice(["TV", "Movie", "OVA", "Special"], p=[0.6, 0.2, 0.1, 0.1], size=n_a)
    episodes = np.random.choice([12, 24, 26, 50, 100, 1], p=[0.45, 0.3, 0.1, 0.05, 0.05, 0.05], size=n_a)
    members = np.random.exponential(50000, size=n_a).astype(int) + 500
    rating = np.round(np.random.normal(7.2, 1.1, size=n_a).clip(1.0, 10.0), 2)
    popularity_rank = np.argsort(-members) + 1
    favorites = (members * np.random.uniform(0.01, 0.08, size=n_a)).astype(int)

    df_anime = pd.DataFrame({
        "anime_id": [f"ANI-{5000+i}" for i in range(n_a)],
        "name": anime_titles,
        "genre": genres,
        "type": types,
        "episodes": episodes,
        "rating": rating,
        "members": members,
        "favorites": favorites,
        "popularity": popularity_rank
    })
    # Missing ratings
    df_anime.loc[np.random.choice(n_a, 20), "rating"] = np.nan
    anime_path = os.path.join(base_dir, "anime.csv")
    df_anime.to_csv(anime_path, index=False)
    print(f"Generated {anime_path} with shape {df_anime.shape}")

    # 4. Sales Forecasting Dataset
    n_s = 1000
    stores = np.random.choice([1, 2, 3, 4, 5], size=n_s)
    depts = np.random.choice([1, 2, 3, 4, 5, 6, 7, 8], size=n_s)
    weekly_sales = np.round(np.random.normal(22000, 8000, size=n_s).clip(1000, 80000), 2)
    is_holiday = np.random.choice([0, 1], p=[0.92, 0.08], size=n_s)
    temperature = np.round(np.random.normal(60, 18, size=n_s), 1)
    fuel_price = np.round(np.random.uniform(2.8, 4.2, size=n_s), 3)
    cpi = np.round(np.random.normal(180, 25, size=n_s), 2)
    unemployment = np.round(np.random.uniform(4.5, 9.5, size=n_s), 3)

    df_sales = pd.DataFrame({
        "Record_ID": [f"REC-{8000+i}" for i in range(n_s)],
        "Store": stores,
        "Dept": depts,
        "Weekly_Sales": weekly_sales,
        "IsHoliday": is_holiday,
        "Temperature": temperature,
        "Fuel_Price": fuel_price,
        "CPI": cpi,
        "Unemployment": unemployment
    })
    sales_path = os.path.join(base_dir, "sales_forecasting.csv")
    df_sales.to_csv(sales_path, index=False)
    print(f"Generated {sales_path} with shape {df_sales.shape}")

if __name__ == "__main__":
    generate_samples()
