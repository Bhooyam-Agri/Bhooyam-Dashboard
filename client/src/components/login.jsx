import Navbar from "./navbar";

export default function Login() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 bg-cover bg-center">
            <div className="flex justify-center items-center w-1/2.5 py-4"><Navbar/></div>
            <div className="flex flex-col min-h-screen justify-center items-center">
                
                <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-lg border border-green-100">
                    <div className="text-center">
                        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                            <img className="h-10 w-auto" src="https://avatars.githubusercontent.com/u/186426063?s=48&v=4" alt="Logo" />
                        </div>
                        <h2 className="mt-6 text-3xl font-bold text-green-800">Sign in to your account</h2>
                    </div>
                    
                    <form className="mt-8 space-y-6">
                        <div className="rounded-md shadow-sm space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-green-700 mb-1">Email address</label>
                                <input id="email" name="email" type="email" required 
                                    className="appearance-none relative block w-full px-3 py-3 border border-green-200 placeholder-green-400 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 sm:text-sm" 
                                    placeholder="Enter your email" />
                            </div>
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-green-700 mb-1">Password</label>
                                <input id="password" name="password" type="password" required 
                                    className="appearance-none relative block w-full px-3 py-3 border border-green-200 placeholder-green-400 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 sm:text-sm" 
                                    placeholder="Enter your password" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input id="remember-me" name="remember-me" type="checkbox" 
                                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-green-300 rounded" />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-green-700">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-medium text-green-600 hover:text-green-800 transition-colors">
                                    Forgot your password?
                                </a>
                            </div>
                        </div>

                        <div>
                            <button type="submit" 
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-md hover:shadow-lg transition-all">
                                Sign in
                            </button>
                        </div>
                    </form>
                </div>
                
                <div className="mt-8 grid grid-cols-3 gap-4">
                    <img src="https://plus.unsplash.com/premium_photo-1667509350852-acd33441f541?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjV8fGh5ZHJvcG9uaWN8ZW58MHx8MHx8fDA%3D" alt="Decorative" className="w-32 h-32 rounded-lg shadow-md border-2 border-green-100" />
                    <img src="https://plus.unsplash.com/premium_photo-1663047551288-0f67e968022b?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDh8fHxlbnwwfHx8fHw%3D" alt="Decorative" className="w-32 h-32 rounded-lg shadow-md border-2 border-green-100" />
                    <img src="https://plus.unsplash.com/premium_photo-1661963586402-b20023897431?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE2fHx8ZW58MHx8fHx8" alt="Decorative" className="w-32 h-32 rounded-lg shadow-md border-2 border-green-100" />
                </div>
            </div>
        </div>
    );
}