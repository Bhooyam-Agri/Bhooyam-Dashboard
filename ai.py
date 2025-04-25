import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.tri as tri
import torch
from torchvision import transforms
from moondream import Moondream
from transformers import AutoTokenizer
from PIL import Image
import requests
from io import BytesIO
import os
import zipfile
from sklearn.neighbors import NearestNeighbors
from tqdm import tqdm
import kaggle

class ComprehensivePlantNPKAnalyzer:
    def __init__(self, csv_path, tomato_zip_path, kaggle_dataset="baronn/lettuce-npk-dataset"):
        # Initialize Moondream
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model = Moondream.from_pretrained("vikhyatk/moondream0").to(self.device)
        self.tokenizer = AutoTokenizer.from_pretrained("vikhyatk/moondream0")
        
        # NPK triangle setup
        self.corners = np.array([[0, 0], [1, 0], [0.5, np.sqrt(3)/2]])
        self.triang = tri.Triangulation(self.corners[:, 0], self.corners[:, 1])
        
        # Image transforms
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
        ])
        
        # Load and combine all datasets
        self.df = self._load_and_combine_datasets(csv_path, tomato_zip_path, kaggle_dataset)
        self.image_cache = {}
        
        # Prepare dataset embeddings
        self._prepare_dataset()
        self._build_knn_model()
    
    def _load_and_combine_datasets(self, csv_path, tomato_zip_path, kaggle_dataset):
        """Load and combine all data sources into one dataframe"""
        print("Loading and combining datasets...")
        
        # 1. Load main CSV
        main_df = pd.read_csv(csv_path)
        
        # 2. Load Tomato Image Dataset
        tomato_df = self._load_tomato_dataset(tomato_zip_path)
        
        # 3. Load Kaggle Lettuce Dataset
        lettuce_df = self._load_kaggle_dataset(kaggle_dataset)
        
        # Combine all datasets
        combined_df = pd.concat([main_df, tomato_df, lettuce_df], ignore_index=True)
        
        # Clean NPK values
        for col in ['N', 'P', 'K']:
            combined_df[col] = pd.to_numeric(combined_df[col], errors='coerce').fillna(0)
        
        # Normalize NPK to sum 100
        combined_df['NPK_sum'] = combined_df[['N', 'P', 'K']].sum(axis=1)
        combined_df['N_norm'] = 100 * combined_df['N'] / combined_df['NPK_sum']
        combined_df['P_norm'] = 100 * combined_df['P'] / combined_df['NPK_sum']
        combined_df['K_norm'] = 100 * combined_df['K'] / combined_df['NPK_sum']
        
        return combined_df
    
    def _load_tomato_dataset(self, zip_path):
        """Extract and process tomato image dataset"""
        print("Processing tomato dataset...")
        
        # Extract zip file
        extract_path = os.path.join(os.path.dirname(zip_path), "extracted_tomato")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(extract_path)
        
        # Create dataframe for tomato images
        tomato_data = []
        for root, _, files in os.walk(extract_path):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                    # Assuming healthy tomatoes have balanced NPK (adjust as needed)
                    tomato_data.append({
                        'Plant_Name': 'Tomato',
                        'Species': 'Solanum lycopersicum',
                        'Image_Path': os.path.join(root, file),
                        'N': 30,  # Default values - adjust based on your knowledge
                        'P': 30,
                        'K': 40,
                        'Source': 'Tomato Image Dataset'
                    })
        
        return pd.DataFrame(tomato_data)
    
    def _load_kaggle_dataset(self, dataset_name):
        """Download and process Kaggle dataset"""
        print("Downloading Kaggle dataset...")
        
        # Download dataset (requires kaggle API setup)
        kaggle.api.dataset_download_files(dataset_name, path="kaggle_data", unzip=True)
        
        # Process the dataset (adjust based on actual structure)
        lettuce_data = []
        for root, _, files in os.walk("kaggle_data"):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg')):
                    # Extract NPK from filename or metadata (adjust as needed)
                    npk = self._extract_npk_from_filename(file)
                    lettuce_data.append({
                        'Plant_Name': 'Lettuce',
                        'Species': 'Lactuca sativa',
                        'Image_Path': os.path.join(root, file),
                        'N': npk[0],
                        'P': npk[1],
                        'K': npk[2],
                        'Source': 'Kaggle Lettuce Dataset'
                    })
        
        return pd.DataFrame(lettuce_data)
    
    def _extract_npk_from_filename(self, filename):
        """Extract NPK values from filename if available"""
        # Example: "lettuce_N30_P20_K50.jpg" -> (30, 20, 50)
        try:
            parts = filename.split('_')
            n = int(parts[1][1:]) if 'N' in parts[1] else 30
            p = int(parts[2][1:]) if 'P' in parts[2] else 20
            k = int(parts[3][1:].split('.')[0]) if 'K' in parts[3] else 50
            return (n, p, k)
        except:
            return (30, 20, 50)  # Default values
    
    def _prepare_dataset(self):
        """Process images and generate embeddings"""
        print("Preparing dataset embeddings...")
        
        self.df['embedding'] = None
        self.df['image_available'] = False
        
        for idx, row in tqdm(self.df.iterrows(), total=len(self.df)):
            img_path = row.get('Image_Path') or row.get('Image_URL')
            if img_path and not pd.isna(img_path):
                try:
                    embedding = self._get_image_embedding(img_path)
                    self.df.at[idx, 'embedding'] = embedding
                    self.df.at[idx, 'image_available'] = True
                except Exception as e:
                    print(f"Error processing image {img_path}: {e}")
    
    def _get_image_embedding(self, img_path):
        """Get embedding for an image (from cache or new)"""
        if img_path in self.image_cache:
            return self.image_cache[img_path]
        
        if img_path.startswith('http'):
            response = requests.get(img_path)
            img = Image.open(BytesIO(response.content)).convert("RGB")
        else:
            img = Image.open(img_path).convert("RGB")
        
        img_tensor = self.transform(img).unsqueeze(0).to(self.device)
        
        with torch.no_grad():
            embedding = self.model.encode_image(img_tensor).cpu().numpy()[0]
        
        self.image_cache[img_path] = embedding
        return embedding
    
    def _build_knn_model(self):
        """Build KNN model from available embeddings"""
        valid_embeddings = self.df[self.df['image_available']]['embedding'].tolist()
        if len(valid_embeddings) == 0:
            raise ValueError("No valid images with embeddings found in dataset")
        
        self.knn = NearestNeighbors(n_neighbors=3, metric='cosine')
        self.knn.fit(np.stack(valid_embeddings))
    
    def analyze_plant(self, image_path_or_url, plant_name=None):
        """Full analysis pipeline for a plant image"""
        # Get image embedding
        try:
            embedding = self._get_image_embedding(image_path_or_url)
        except Exception as e:
            return {"error": f"Could not process image: {e}"}
        
        # Find nearest neighbors
        distances, indices = self.knn.kneighbors([embedding])
        
        # Get NPK values from nearest neighbors
        similar_plants = self.df.iloc[indices[0]]
        weights = 1 / (distances[0] + 1e-6)
        weights /= weights.sum()
        
        predicted_npk = np.zeros(3)
        for i, (_, row) in enumerate(similar_plants.iterrows()):
            predicted_npk += weights[i] * row[['N_norm', 'P_norm', 'K_norm']].values
        
        # Generate description
        description = self._generate_description(image_path_or_url, predicted_npk)
        
        # Visualize
        self._visualize_npk(predicted_npk, plant_name)
        
        return {
            "npk": predicted_npk.round().astype(int),
            "description": description,
            "similar_plants": similar_plants[['Plant_Name', 'Species', 'N', 'P', 'K', 'Source']].to_dict('records')
        }

# Example usage
if __name__ == "__main__":
    analyzer = ComprehensivePlantNPKAnalyzer(
        csv_path="C:/Users/hacke/Downloads/Telegram Desktop/fully_cleaned_plant_dataset.csv",
        tomato_zip_path="C:/Users/hacke/Downloads/Healthy Tomato Image Dataset.zip",
        kaggle_dataset="baronn/lettuce-npk-dataset"
    )
    
    # Analyze a plant (can be URL or local path)
    result = analyzer.analyze_plant(
        image_path_or_url="path/to/your_plant_image.jpg",
        plant_name="Test Plant"
    )
    
    print("Analysis Results:")
    print(f"Predicted NPK: {result['npk']}")
    print(f"Description: {result['description']}")
    print("Similar Plants in Dataset:")
    for plant in result['similar_plants']:
        print(f"- {plant['Plant_Name']} ({plant['Species']}) NPK: {plant['N']}-{plant['P']}-{plant['K']} [Source: {plant['Source']}]")