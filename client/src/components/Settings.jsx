import { useState, useRef } from 'react';
import { 
    Upload, Settings, Plus, BarChart2, Thermometer, Wind, Home, Info, HelpCircle, 
    ShoppingBag, Mail, Leaf, TrashIcon, Edit2, Sun, CloudRain, MoreHorizontal, Search, Bell, User,
    X, Check, AlertCircle, AlertTriangle, CheckCircle
} from 'lucide-react';
import Navbar from './navbar';

export default function PlantManagementSystem() {
    const [plants, setPlants] = useState([
        { id: 1, name: 'Tomato', age: 45, type: 'Vegetable', health: 'Healthy', lastWatered: '2 hours ago', imageUrl: 'https://placehold.co/300x200/green/white?text=Tomato' },
        { id: 2, name: 'Basil', age: 30, type: 'Herb', health: 'Needs attention', lastWatered: '1 day ago', imageUrl: 'https://placehold.co/300x200/green/white?text=Basil' },
        { id: 3, name: 'Rose', age: 60, type: 'Flower', health: 'Healthy', lastWatered: '6 hours ago', imageUrl: 'https://placehold.co/300x200/pink/white?text=Rose' }
    ]);
    
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        type: '',
        imageUrl: ''
    });

    // Notifications state
    const [notifications, setNotifications] = useState([
        { id: 1, message: 'Water your Basil plant today!', type: 'warning' },
        { id: 2, message: 'New sensor data available', type: 'info' }
    ]);
    const [showNotifications, setShowNotifications] = useState(false);
    
    // Edit mode state
    const [editMode, setEditMode] = useState(false);
    const [editId, setEditId] = useState(null);
    const fileInputRef = useRef(null);
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };
    
    const handleAddPlant = () => {
        if (formData.name && formData.age && formData.type) {
            if (editMode) {
                // Update existing plant
                setPlants(plants.map(plant => 
                    plant.id === editId ? {
                        ...plant,
                        name: formData.name,
                        age: parseInt(formData.age),
                        type: formData.type,
                        imageUrl: formData.imageUrl || plant.imageUrl
                    } : plant
                ));
                setEditMode(false);
                setEditId(null);
                addNotification(`${formData.name} updated successfully`, 'success');
            } else {
                // Add new plant
                setPlants([
                    ...plants,
                    {
                        id: plants.length + 1,
                        name: formData.name,
                        age: parseInt(formData.age),
                        type: formData.type,
                        health: 'Healthy',
                        lastWatered: 'Just now',
                        imageUrl: formData.imageUrl || 'https://placehold.co/300x200/gray/white?text=No+Image'
                    }
                ]);
                addNotification(`${formData.name} added successfully`, 'success');
            }
            setFormData({ name: '', age: '', type: '', imageUrl: '' });
        }
    };

    const handleEditPlant = (plant) => {
        setFormData({
            name: plant.name,
            age: plant.age,
            type: plant.type,
            imageUrl: plant.imageUrl
        });
        setEditMode(true);
        setEditId(plant.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    const handleDeletePlant = (id) => {
        const plantName = plants.find(p => p.id === id).name;
        setPlants(plants.filter(plant => plant.id !== id));
        addNotification(`${plantName} has been deleted`, 'info');
    };
    
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                // Create form data for the API request
                const uploadData = new FormData();
                uploadData.append('image', file);
                uploadData.append('key', '3de84ee985ec428aaaffe08c4c8f41c0');
                
                // Show loading notification
                addNotification('Uploading image...', 'info');
                
                // Upload to ImgBB
                const response = await fetch('https://api.imgbb.com/1/upload', {
                    method: 'POST',
                    body: uploadData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    setFormData(prevFormData => ({
                        ...prevFormData,
                        imageUrl: data.data.url
                    }));
                    addNotification('Image uploaded successfully', 'success');
                } else {
                    addNotification('Failed to upload image', 'error');
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                addNotification('Error uploading image', 'error');
            }
        }
    };
    
    
    // Function can be used in the future for random color generation
    // const getRandomColor = () => {
    //     const colors = ['green', 'blue', 'red', 'yellow', 'purple', 'orange'];
    //     return colors[Math.floor(Math.random() * colors.length)];
    // };
    
    const addNotification = (message, type = 'info') => {
        const id = Date.now();
        setNotifications([
            { id, message, type },
            ...notifications
        ]);
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            setNotifications(prevNotifs => prevNotifs.filter(n => n.id !== id));
        }, 5000);
    };
    
    const dismissNotification = (id) => {
        setNotifications(notifications.filter(n => n.id !== id));
    };
    
    const getTypeIcon = (type) => {
        switch(type) {
            case 'Vegetable': return <ShoppingBag size={16} className="text-green-600" />;
            case 'Fruit': return <BarChart2 size={16} className="text-orange-500" />;
            case 'Flower': return <Sun size={16} className="text-pink-500" />;
            case 'Herb': return <Wind size={16} className="text-blue-500" />;
            default: return <Leaf size={16} className="text-green-500" />;
        }
    };
    
    const getHealthStatus = (health) => {
        return health === 'Healthy' 
            ? <span className="flex items-center text-green-600"><span className="w-2 h-2 rounded-full bg-green-600 mr-1"></span> {health}</span>
            : <span className="flex items-center text-amber-600"><span className="w-2 h-2 rounded-full bg-amber-600 mr-1"></span> {health}</span>;
    };
    
    return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50">
            {/* Navigation */}
            <div className="flex w-1/2.5 py-4"><Navbar/></div>
            
            {/* User Bar */}
            <div className="bg-white shadow">
                <div className="max-w-6xl mx-auto p-3 flex justify-between items-center">
                    <div className="flex items-center">
                        <div className="relative mr-4">
                            <input 
                                type="text" 
                                placeholder="Search plants..." 
                                className="pl-9 pr-3 py-1 border border-gray-300 rounded-full text-sm"
                            />
                            <Search size={16} className="absolute left-3 top-2 text-gray-400" />
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <button 
                                className="relative"
                                onClick={() => setShowNotifications(!showNotifications)}
                            >
                                <Bell size={20} className="text-gray-600" />
                                <span className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-white text-xs">
                                    {notifications.length}
                                </span>
                            </button>
                            
                            {/* Notifications Panel */}
                            {showNotifications && (
                                <div className="absolute right-0 top-10 w-80 bg-white rounded-lg shadow-xl z-50 border overflow-hidden">
                                    <div className="flex justify-between items-center p-3 bg-green-50 border-b">
                                        <h3 className="font-semibold text-green-700">Notifications</h3>
                                        <button onClick={() => setShowNotifications(false)} className="text-gray-500 hover:text-gray-700">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    
                                    <div className="max-h-96 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-4 text-center text-gray-500">No notifications</div>
                                        ) : (
                                            notifications.map(notif => (
                                                <div key={notif.id} className={`p-3 border-b ${
                                                    notif.type === 'success' ? 'bg-green-50' : 
                                                    notif.type === 'warning' ? 'bg-yellow-50' : 
                                                    notif.type === 'error' ? 'bg-red-50' : 'bg-blue-50'
                                                }`}>
                                                    <div className="flex">
                                                        <div className="mt-0.5 mr-2">
                                                            {notif.type === 'success' ? <CheckCircle size={16} className="text-green-600" /> :
                                                             notif.type === 'warning' ? <AlertTriangle size={16} className="text-yellow-600" /> :
                                                             notif.type === 'error' ? <AlertCircle size={16} className="text-red-600" /> :
                                                             <Info size={16} className="text-blue-600" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm">{notif.message}</p>
                                                        </div>
                                                        <button onClick={() => dismissNotification(notif.id)} className="text-gray-400 hover:text-gray-600 ml-2">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    
                                    {notifications.length > 0 && (
                                        <div className="p-2 border-t text-center">
                                            <button 
                                                onClick={() => setNotifications([])}
                                                className="text-sm text-gray-500 hover:text-gray-700"
                                            >
                                                Clear all
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
                                <User size={16} className="text-green-700" />
                            </div>
                            <span className="text-sm font-medium hidden md:block">Garden User</span>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-grow max-w-6xl mx-auto w-full p-4">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                        <Settings className="mr-2 text-green-600" size={24} /> Plant Settings
                    </h1>
                    <button className="flex items-center bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                        <Plus size={18} className="mr-1" /> New Plant
                    </button>
                </div>
                
                {/* Add/Edit Plant Form */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6 border-l-4 border-green-500">
                    <h2 className="text-xl font-semibold mb-4 flex items-center text-green-600">
                        {editMode ? (
                            <><Edit2 className="mr-2" size={20} /> Edit Plant</>
                        ) : (
                            <><Plus className="mr-2" size={20} /> Add New Plant</>
                        )}
                    </h2>
                    <div className="grid md:grid-cols-4 gap-4">
                        <div>
                            <label className="flex text-sm font-medium text-gray-700 mb-1 items-center">
                                <Leaf size={16} className="mr-1 text-green-500" /> Plant Name
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                placeholder="Enter plant name"
                            />
                        </div>
                        <div>
                            <label className="flex text-sm font-medium text-gray-700 mb-1 items-center">
                                <CloudRain size={16} className="mr-1 text-blue-500" /> Plant Age (days)
                            </label>
                            <input
                                type="number"
                                name="age"
                                value={formData.age}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                                placeholder="Age in days"
                            />
                        </div>
                        <div>
                            <label className="flex text-sm font-medium text-gray-700 mb-1 items-center">
                                <Sun size={16} className="mr-1 text-yellow-500" /> Plant Type
                            </label>
                            <select 
                                name="type"
                                value={formData.type}
                                onChange={handleInputChange}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none appearance-none bg-white"
                            >
                                <option value="">Select Plant Type</option>
                                <option value="Vegetable">Vegetable</option>
                                <option value="Fruit">Fruit</option>
                                <option value="Flower">Flower</option>
                                <option value="Herb">Herb</option>
                            </select>
                        </div>
                        <div>
                            <label className="flex text-sm font-medium text-gray-700 mb-1 items-center">
                                <Upload size={16} className="mr-1 text-purple-500" /> Plant Image
                            </label>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                                accept="image/*"
                            />
                            <div 
                                onClick={() => fileInputRef.current.click()}
                                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 hover:border-green-500 transition-colors"
                            >
                                {formData.imageUrl ? (
                                    <div className="relative">
                                        <img src={formData.imageUrl} alt="Preview" className="w-full h-16 object-cover rounded" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity rounded">
                                            <Upload className="text-white" size={20} />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="mx-auto mb-1 text-gray-400" size={24} />
                                        <span className="text-sm text-gray-500">Click to upload plant image</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={handleAddPlant}
                        className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 flex items-center transition-colors"
                    >
                        {editMode ? (
                            <><Check size={18} className="mr-1" /> Update Plant</>
                        ) : (
                            <><Plus size={18} className="mr-1" /> Add Plant</>
                        )}
                    </button>
                    {editMode && (
                        <button 
                            onClick={() => {
                                setEditMode(false);
                                setFormData({ name: '', age: '', type: '', imageUrl: '' });
                            }}
                            className="mt-4 ml-2 bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>
                
                {/* Sensor Data Cards (unchanged) */}
                
                {/* Plant List */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold flex items-center">
                            <Leaf className="mr-2 text-green-600" size={20} /> Your Plants
                        </h2>
                        <div className="flex space-x-2">
                            <select className="text-sm border border-gray-300 rounded-lg px-3 py-1">
                                <option>All Types</option>
                                <option>Vegetable</option>
                                <option>Fruit</option>
                                <option>Flower</option>
                                <option>Herb</option>
                            </select>
                            <select className="text-sm border border-gray-300 rounded-lg px-3 py-1">
                                <option>Sort by: Name</option>
                                <option>Sort by: Age</option>
                                <option>Sort by: Type</option>
                                <option>Sort by: Health</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                        {plants.map(plant => (
                            <div key={plant.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className="h-40 bg-gray-100 relative">
                                    <img src={plant.imageUrl} alt={plant.name} className="w-full h-full object-cover" />
                                    <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow">
                                        {getTypeIcon(plant.type)}
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-lg">{plant.name}</h3>
                                    <div className="flex justify-between text-sm text-gray-600 my-1">
                                        <span className="flex items-center">
                                            <CloudRain size={14} className="mr-1 text-blue-500" /> {plant.lastWatered}
                                        </span>
                                        <span>{getHealthStatus(plant.health)}</span>
                                    </div>
                                    <div className="text-sm text-gray-600 mb-3">
                                        <p className="flex items-center">
                                            <Sun size={14} className="mr-1 text-yellow-500" /> Type: {plant.type}
                                        </p>
                                        <p className="flex items-center">
                                            <Thermometer size={14} className="mr-1 text-red-500" /> Age: {plant.age} days
                                        </p>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button 
                                            onClick={() => handleEditPlant(plant)}
                                            className="flex-1 bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-600 flex items-center justify-center"
                                        >
                                            <Edit2 size={14} className="mr-1" /> Edit
                                        </button>
                                        <button 
                                            onClick={() => handleDeletePlant(plant.id)}
                                            className="flex-1 bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-600 flex items-center justify-center"
                                        >
                                            <TrashIcon size={14} className="mr-1" /> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Footer (unchanged) */}
        </div>
    );
}