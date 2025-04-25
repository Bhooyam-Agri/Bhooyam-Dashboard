import csv
import sys

def print_csv(file_path):
    try:
        with open(file_path="C:\Users\hacke\Downloads\Telegram Desktop\fully_cleaned_plant_dataset.csv", 'r', newline='') as csvfile:
            csv_reader = csv.reader(csvfile)
            
            # Read the header
            header = next(csv_reader)
            
            # Print header
            print(','.join(header))
            print('-' * 80)  # Separator line
            
            # Print each row
            for row in csv_reader:
                print(','.join(row))
                
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
    except Exception as e:
        print(f"Error reading CSV file: {e}")

if __name__ == "__main__":
    # Get the file path from command line argument or user input
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        file_path = input("Enter the path to your CSV file: ")
    
    print_csv(file_path)