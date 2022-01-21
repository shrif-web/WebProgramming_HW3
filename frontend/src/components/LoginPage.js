import React, {useEffect, useState} from 'react';
import {Link, useNavigate} from "react-router-dom";
import {Alert, Button, Card, Form, Spin, Input} from "antd";
import Checkbox from "antd/es/checkbox/Checkbox";

function LoginPage() {
    const navigate = useNavigate();
    const [error, setError] = useState(undefined);
    const [progress, updateProgress] = useState(false);
    const onFinish = async (values) => {
        const {username, password} = values;
        updateProgress(true)
        try {
            // console.log("username : ",username,"password : ",password)
            // // const user = await Parse.User.logIn(username, password);
            // // console.log(user);
            // // navigate('/notes');
            // async componentDidMount() {
            //     // POST request using fetch with async/await
            //     const requestOptions = {
            //         method: 'POST',
            //         headers: { 'Content-Type': 'application/json' },
            //         body: JSON.stringify({ title: 'React POST Request Example' })
            //     };
            //     const response = await fetch('https://reqres.in/api/posts', requestOptions);
            //     const data = await response.json();
            //     this.setState({ postId: data.id });
            // }
            // POST request using fetch with error handling
            // POST request using fetch inside useEffect React hook
            const token = undefined;
            const requestOptions = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({username: `${username}`, password: `${password}`})
            };
            console.log("---req options--->", requestOptions);
            fetch('http://localhost:8000/users/login', requestOptions)
                .then(response => console.log(response.json()))
                .then(data => console.log(data))
                .catch(err => console.log(err));
// empty dependency array means this effect will only run once (like componentDidMount in classes)
        } catch (err) {
            console.log(err.message);
            setVisible(true)
            setError(err.message);
            setTimeout(() => {
                setVisible(false)
            }, 5000);
        } finally {
            updateProgress(false);
        }

    };

    const onFinishFailed = (errorInfo) => {
        // console.log('Failed:', errorInfo);
    };

    const [visible, setVisible] = useState(false);

    const handleClose = () => {
        setVisible(false);
    };
    return (
        <div>
            <center>

                <div style={{backgroundColor: 'red', marginBottom: 20, fontWeight: 'bold'}}>
                    {visible ? (
                        <Alert message={error} type="fail" closable afterClose={handleClose} style={{text: 'white'}}/>
                    ) : null}
                </div>
                <Card title="login page" style={{width: 300}}>

                    <Form
                        name="basic"
                        labelCol={{
                            span: 8,
                        }}
                        wrapperCol={{
                            span: 16,
                        }}
                        initialValues={{
                            remember: true,
                        }}
                        onFinish={onFinish}
                        onFinishFailed={onFinishFailed}
                        autoComplete="off"
                    >
                        <Form.Item
                            label="Username"
                            name="username"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please input your username!',
                                },
                            ]}
                        >
                            <Input
                                placeholder={'username'}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Password"
                            name="password"
                            rules={[
                                {
                                    required: true,
                                    message: 'Please input your password!',
                                },
                            ]}
                        >
                            <Input.Password placeholder={"password"}/>
                        </Form.Item>

                        <Form.Item
                            name="remember"
                            valuePropName="checked"
                            wrapperCol={{
                                offset: 8,
                                span: 16,
                            }}
                        >
                            <Checkbox>Remember me</Checkbox>
                        </Form.Item>

                        <Form.Item
                            wrapperCol={{
                                offset: 8,
                                span: 16,
                            }}
                        >
                            <Button htmlType="submit">
                                {progress && <Spin style={{marginRight: 20}}/>}
                                Login
                            </Button>
                        </Form.Item>
                        <Form.Item
                            wrapperCol={{
                                offset: 8,
                                span: 16,
                            }}
                        >
                            <Button htmlType="link">
                                {progress && <Spin style={{marginRight: 20}}/>}
                                <Link to={"/register"}>
                                    Register
                                </Link>
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </center>
        </div>
    );
}

export default LoginPage;